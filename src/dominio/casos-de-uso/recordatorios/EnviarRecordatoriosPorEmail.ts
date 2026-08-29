import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "../../repositorios/IEmailEnviadoRepositorio";
import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "../../repositorios/IConfiguracionRecordatoriosRepositorio";
import type { IServicioEmail } from "../../servicios/IServicioEmail";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import { EmailEnviado } from "../../entidades/EmailEnviado";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";
import { CLAVE_RECORDATORIO_TURNO } from "../../entidades/PlantillaEmail";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import type { Turno } from "../../entidades/Turno";
import { variablesRecordatorio } from "../secretaria/variables";

const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

/** Opciones del envío manual (el programado no las necesita). */
export interface OpcionesEnvioManual {
  /** Manda aunque el último aviso sea reciente. */
  forzar?: boolean;
  /** Horas que tienen que pasar desde el último aviso. */
  horasEntreAvisos?: number;
  /** Momento de la corrida, compartido por todo el lote. */
  ahora?: Date;
}

/** Resumen del barrido de recordatorios. */
export interface ResultadoRecordatoriosEmail {
  enviados: number;
  omitidos: number; // ya tenían recordatorio (idempotencia)
  fallidos: number; // sin email o error de envío
}

/**
 * Caso de uso: enviar por email los recordatorios de turno que toquen hoy.
 *
 * Vive en `recordatorios` y no en `secretaria` porque el email es UNO de los
 * tres medios de la misma política, no una función aparte de Secretaría. Antes
 * había dos caminos para lo mismo —un botón en Secretaría y un cron propio—, y
 * dos caminos para mandar el mismo aviso es la forma más directa de que un día
 * se manden los dos. Secretaría conserva lo que sí es suyo: el TEXTO de la
 * plantilla de email.
 *
 * La anticipación tampoco es fija: sale de la configuración de recordatorios
 * del consultorio, que puede pedir varios avisos ([3, 1] = uno tres días antes
 * y otro el día anterior). Con el medio apagado no manda nada.
 *
 * - Solo turnos PENDIENTE o CONFIRMADO (los cancelados/completados no molestan).
 * - Idempotente POR ESCALÓN: la unicidad de `emails_enviados` es
 *   (plantillaClave, referenciaId), así que la referencia lleva los días de
 *   anticipación. Sin eso, el aviso de 3 días bloquearía al de 1 día y el
 *   paciente recibiría uno solo de los dos.
 * - Solo se registran los envíos exitosos, de modo que un fallo se reintenta
 *   en el próximo barrido.
 */
export class EnviarRecordatoriosPorEmail {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly preferencias: IConfiguracionRecordatoriosRepositorio,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(): Promise<ResultadoRecordatoriosEmail> {
    const config =
      (await this.preferencias.obtener()) ??
      ConfiguracionRecordatorios.porDefecto();
    const escalones = config.diasAntesEmailAutomatico;
    if (escalones.length === 0) {
      return { enviados: 0, omitidos: 0, fallidos: 0 };
    }

    const plantilla = await this.plantillas.obtenerPorClave(
      CLAVE_RECORDATORIO_TURNO,
    );
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(CLAVE_RECORDATORIO_TURNO);
    }

    const hoy = this.reloj.hoy();
    let enviados = 0;
    let omitidos = 0;
    let fallidos = 0;

    for (const dias of escalones) {
      const fecha = new Date(hoy.getTime() + dias * DIA_MS);
      for (const turno of await this.turnos.obtenerEnFecha(fecha)) {
        const resultado = await this.enviarParaTurno(turno, dias);
        if (resultado === "ENVIADO") enviados += 1;
        else if (resultado === "OMITIDO") omitidos += 1;
        else fallidos += 1; // FALLIDO o sin email cargado
      }
    }

    return { enviados, omitidos, fallidos };
  }

  /**
   * El recordatorio por email de UN turno.
   *
   * Lo comparten el barrido automático y el envío manual de la consola: el
   * profesional que tilda pacientes y aprieta "Enviar" espera que salgan los
   * medios que tiene activos, no solo WhatsApp.
   *
   * `diasAntes` es el escalón de la programación; null en los envíos manuales.
   *
   * La protección contra el duplicado NO es la misma en los dos casos, y la
   * diferencia importa:
   *
   *   * Escalón programado — idempotencia dura por referencia única. El
   *     barrido lo corre el worker y puede reintentar: tiene que ser imposible
   *     mandar dos veces el mismo escalón.
   *   * Manual — margen de horas. Detrás hay una persona apretando un botón, y
   *     lo que hay que evitar es el duplicado por error, no la insistencia
   *     deliberada de dos días después.
   */
  async enviarParaTurno(
    turno: Turno,
    diasAntes: number | null,
    opciones: OpcionesEnvioManual = {},
  ): Promise<"ENVIADO" | "OMITIDO" | "FALLIDO" | "SIN_EMAIL"> {
    if (turno.estado !== "PENDIENTE" && turno.estado !== "CONFIRMADO") {
      return "OMITIDO";
    }

    const referencia = referenciaDe(turno.id, diasAntes);

    if (diasAntes != null) {
      // Escalón programado: la idempotencia es la de siempre, por referencia.
      if (await this.emails.yaEnviado(CLAVE_RECORDATORIO_TURNO, referencia)) {
        return "OMITIDO";
      }
    } else if (!opciones.forzar) {
      // Envío manual: bloquea por MARGEN, no para siempre. Pasado el plazo se
      // puede volver a avisar sin apagar la protección de todo el lote.
      const ultimo = await this.emails.ultimoEnviadoParaTurno(
        CLAVE_RECORDATORIO_TURNO,
        turno.id,
      );
      const ahora = opciones.ahora ?? this.reloj.ahora();
      const margen = opciones.horasEntreAvisos ?? 0;
      if (
        ultimo != null &&
        (ahora.getTime() - ultimo.getTime()) / HORA_MS < margen
      ) {
        return "OMITIDO";
      }
    }

    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    if (!paciente || !paciente.email) {
      return "SIN_EMAIL";
    }

    const plantilla = await this.plantillas.obtenerPorClave(
      CLAVE_RECORDATORIO_TURNO,
    );
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(CLAVE_RECORDATORIO_TURNO);
    }

    const { asunto, html } = plantilla.renderizar(
      variablesRecordatorio({
        nombrePaciente: paciente.nombreCompleto,
        fecha: turno.fecha,
        hora: turno.hora,
        nombreProfesional: this.nombreProfesional,
      }),
    );

    try {
      await this.servicioEmail.enviar({ para: paciente.email, asunto, html });
    } catch (error) {
      // No se registra: sin fila en `emails_enviados`, el próximo barrido lo
      // vuelve a intentar. Registrar el fallo lo daría por avisado para siempre.
      console.error(
        `[recordatorios] falló el email del turno ${turno.id}:`,
        error,
      );
      return "FALLIDO";
    }

    await this.emails.registrar(
      EmailEnviado.crear(
        {
          plantillaClave: CLAVE_RECORDATORIO_TURNO,
          para: paciente.email,
          asunto,
          referenciaId: referencia,
          pacienteId: paciente.id,
        },
        crypto.randomUUID(),
        this.reloj.ahora(),
      ),
    );
    return "ENVIADO";
  }
}

/**
 * Clave de idempotencia del aviso.
 *
 * El escalón de 1 día conserva la referencia vieja (el turnoId pelado) porque
 * es la que quedó escrita en `emails_enviados` cuando el recordatorio era uno
 * solo y siempre del día anterior. Cambiarla habría hecho que, el día del
 * despliegue, todos los turnos de mañana recibieran de nuevo un aviso que ya
 * habían recibido.
 *
 * Los manuales llevan su propia referencia para no pisar la de un escalón: que
 * el profesional avise a mano hoy no puede cancelar el aviso automático de
 * mañana.
 */
function referenciaDe(turnoId: string, dias: number | null): string {
  // Los manuales llevan una referencia única por envío: la unicidad de
  // `emails_enviados` es (plantilla, referencia), y con una referencia fija el
  // segundo aviso a mano —ya permitido por el margen— chocaría contra el
  // índice. Siguen empezando con el turnoId para que `ultimoEnviadoParaTurno`
  // los encuentre.
  if (dias == null) return `${turnoId}:manual:${Date.now()}`;
  return dias === 1 ? turnoId : `${turnoId}:${dias}`;
}

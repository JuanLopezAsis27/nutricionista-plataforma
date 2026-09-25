import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { EmailEnviado } from "@/dominio/entidades/EmailEnviado";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import { ErrorPlantillaEmailRecordatorioNoEncontrada } from "@/dominio/errores/ErrorPlantillaEmailRecordatorioNoEncontrada";
import type { Turno } from "@/dominio/entidades/Turno";
import { variablesRecordatorio } from "../secretaria/variables";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IEnlacesTurno } from "@/dominio/servicios/IEnlacesTurno";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { escaparHtml } from "@/dominio/plantillas/renderizar";
import { enlaceCancelacionPorWhatsapp } from "@/dominio/servicios/cancelacionPorWhatsapp";
import { telefonoCancelaciones } from "./armadoRecordatorio";

/** Clave de auditoría de los emails de recordatorio (independiente de qué plantilla se usó). */
const CLAVE_RECORDATORIO_TURNO = "RECORDATORIO_TURNO";

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
  /**
   * Días reales que faltan para el turno, para elegir la plantilla del
   * escalón que corresponda aunque el envío sea manual (`diasAntes` sigue en
   * null: gobierna la idempotencia, no el texto). Sin esto —el barrido
   * programado no lo pasa— se usa `diasAntes`.
   */
  diasParaPlantilla?: number | null;
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
    private readonly plantillas: IPlantillaEmailRecordatorioRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly preferencias: IConfiguracionRecordatoriosRepositorio,
    /**
     * Da {{profesional}}: el nombre del consultorio en curso, el mismo que usa
     * el recordatorio por WhatsApp. No es un parámetro fijo del constructor
     * porque el caso de uso lo comparten todos los consultorios.
     */
    private readonly nutricionistas: INutricionistaRepositorio,
    /** Da {{establecimiento}} y {{direccion}} a la plantilla del email. */
    private readonly establecimientos: IEstablecimientoRepositorio,
    /** Da los botones "Confirmar asistencia" y "Cancelar turno". */
    private readonly enlaces: IEnlacesTurno,
    /** Da el número de cancelaciones del botón «cancelar por WhatsApp». */
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(): Promise<ResultadoRecordatoriosEmail> {
    const config =
      (await this.preferencias.obtener()) ??
      ConfiguracionRecordatorios.porDefecto();
    const escalones = config.diasAntesEmailAutomatico;
    if (escalones.length === 0) {
      return { enviados: 0, omitidos: 0, fallidos: 0 };
    }

    // Falla rápido si no hay ni siquiera una predeterminada: sin eso, un
    // escalón sin plantilla propia se queda sin texto para mandar.
    const predeterminada = await this.plantillas.obtenerPredeterminada();
    if (!predeterminada) {
      throw new ErrorPlantillaEmailRecordatorioNoEncontrada("predeterminada");
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

    // El escalón con plantilla propia usa SU texto; sin una para ese día se
    // usa la predeterminada. En un envío manual `diasAntes` es null (así
    // funciona la idempotencia por margen), pero el turno igual tiene una
    // fecha real: `diasParaPlantilla` es lo que decide el TEXTO en ese caso,
    // para que "3 días antes" y "1 día antes" digan lo que corresponde aunque
    // el profesional los mande a mano y no por el barrido.
    const diaPlantilla =
      opciones.diasParaPlantilla !== undefined
        ? opciones.diasParaPlantilla
        : diasAntes;
    const plantilla =
      (diaPlantilla != null
        ? await this.plantillas.obtenerPorDia(diaPlantilla)
        : null) ?? (await this.plantillas.obtenerPredeterminada());
    if (!plantilla) {
      throw new ErrorPlantillaEmailRecordatorioNoEncontrada("predeterminada");
    }

    // La sede del turno: con varios consultorios, un recordatorio que no dice
    // dónde manda al paciente al lugar equivocado.
    const sede = await this.establecimientos.obtenerPorId(
      turno.establecimientoId,
    );

    const variables = variablesRecordatorio({
      nombrePaciente: paciente.nombreCompleto,
      fecha: turno.fecha,
      hora: turno.hora,
      nombreProfesional: await this.nutricionistas.nombreDelActual(),
      nombreEstablecimiento: sede?.nombre,
      direccionEstablecimiento: sede?.direccion,
    });
    const { asunto, html } = plantilla.renderizar(variables);

    // Los botones van fuera de la plantilla, para que también los tengan las
    // que ya se editaron. Son una decisión POR PLANTILLA: no todo mensaje de
    // recordatorio tiene sentido que pida confirmar o que ofrezca cancelar.
    const cuerpo =
      html + (await this.botones(turno, plantilla, variables)).join("");

    try {
      await this.servicioEmail.enviar({
        para: paciente.email,
        asunto,
        html: cuerpo,
      });
    } catch (error) {
      // No se registra: sin fila en `emails_enviados`, el próximo barrido lo
      // vuelve a intentar. Registrar el fallo lo daría por avisado para siempre.
      console.error(
        `[recordatorios] ${new Date().toISOString()} falló el email del turno ${turno.id}:`,
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

  /**
   * Los botones que lleva el email de ESTE turno, en HTML.
   *
   * - Confirmar: solo si el turno está PENDIENTE (uno confirmado no lo pide).
   * - Cancelar: si el turno sigue activo y la plantilla lo ofrece. Por la app,
   *   un enlace firmado que vence al terminar el día del turno; por WhatsApp,
   *   el chat de cancelaciones. Sin ese número cargado el botón no sale: un
   *   enlace a ningún lado es peor que no ofrecerlo, y el email sale igual.
   */
  private async botones(
    turno: Turno,
    plantilla: PlantillaEmailRecordatorio,
    variables: Record<string, string>,
  ): Promise<string[]> {
    const vence = new Date(turno.fecha.getTime() + DIA_MS);
    const botones: string[] = [];
    if (turno.estado === "PENDIENTE" && plantilla.incluirBotonConfirmacion) {
      botones.push(
        boton(
          this.enlaces.generar("CONFIRMAR", turno.id, vence),
          "Confirmar asistencia",
          COLOR_CONFIRMAR,
        ),
      );
    }
    if (plantilla.botonCancelacion === "APP") {
      botones.push(
        boton(
          this.enlaces.generar("CANCELAR", turno.id, vence),
          "Cancelar turno",
          COLOR_CANCELAR,
        ),
      );
    } else if (plantilla.botonCancelacion === "WHATSAPP") {
      const config =
        (await this.configuracion.obtener()) ??
        ConfiguracionConsultorio.porDefecto();
      const telefono = telefonoCancelaciones(config);
      if (telefono) {
        botones.push(
          boton(
            enlaceCancelacionPorWhatsapp(
              telefono,
              plantilla.mensajeCancelacion,
              variables,
            ),
            "Cancelar turno por WhatsApp",
            COLOR_CANCELAR,
          ),
        );
      } else {
        console.warn(
          `[recordatorios] la plantilla «${plantilla.nombre}» ofrece cancelar por WhatsApp y no hay número de cancelaciones: el email sale sin ese botón.`,
        );
      }
    }
    return botones;
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

const COLOR_CONFIRMAR = "#F4535E";
/**
 * Cancelar va en gris y no en el color de la marca: es la acción que no se
 * deshace, y no tiene que competir con «Confirmar» por ser la principal.
 */
const COLOR_CANCELAR = "#6B7280";

function boton(enlace: string, texto: string, color: string): string {
  return (
    `<p style="margin:24px 0">` +
    `<a href="${escaparHtml(enlace)}" style="display:inline-block;padding:12px 24px;` +
    `background-color:${color};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">` +
    `${escaparHtml(texto)}</a></p>`
  );
}

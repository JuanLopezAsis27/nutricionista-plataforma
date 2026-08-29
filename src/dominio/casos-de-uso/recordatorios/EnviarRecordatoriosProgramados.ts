import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "../../repositorios/IPlantillaWhatsappRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "../../repositorios/IConfiguracionRecordatoriosRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import type { Paciente } from "../../entidades/Paciente";
import type { Turno } from "../../entidades/Turno";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";
import { EnviarRecordatorioWhatsapp } from "./EnviarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Lo que pasó en un medio durante la corrida. */
export interface ResultadoMedio {
  /** false = el medio está apagado o no tiene envío automático. */
  corrio: boolean;
  enviados: number;
  omitidos: number;
  fallidos: number;
  /** Por qué no corrió, para que el log del worker lo diga. */
  motivo: string | null;
}

/** Resumen de una corrida del barrido. */
export interface ResultadoProgramados {
  /** false = no era la hora configurada; ningún medio se tocó. */
  corrio: boolean;
  motivo: string | null;
  whatsapp: ResultadoMedio;
  email: ResultadoMedio;
  /** Total enviado entre todos los medios (lo que se muestra al profesional). */
  enviados: number;
}

/**
 * Caso de uso: el barrido de recordatorios automáticos, de TODOS los medios.
 *
 * Lo dispara el cron del worker una vez por hora y por inquilino. Es la ÚNICA
 * vía por la que sale un recordatorio automático: antes el email tenía su
 * propio cron y su propio botón en Secretaría, y dos caminos para mandar el
 * mismo aviso es la forma más directa de que un día salgan los dos.
 *
 * Cada consultorio decide en su configuración a qué hora sale y con cuánta
 * anticipación por medio: [3, 1] son dos avisos, uno tres días antes del turno
 * y otro el día anterior.
 *
 * Tres decisiones que conviene tener presentes:
 *
 *   1. El barrido corre todas las horas y se APAGA solo comparando la hora
 *      configurada. Es más simple —y sobre todo más robusto ante un worker que
 *      arrancó tarde— que programar un cron distinto por consultorio.
 *   2. Recorre los escalones de mayor a menor anticipación. Con [3, 1], un
 *      turno que se cargó ayer para pasado mañana no recibe el aviso de 3 días
 *      (esa fecha ya pasó) pero sí el de 1 día.
 *   3. Es idempotente en los dos medios: WhatsApp por el índice único
 *      (turno, diasAntes) y el email por la unicidad de `emails_enviados`.
 *      Correrlo dos veces el mismo día no reenvía nada, y eso es lo que
 *      permite que pg-boss reintente un inquilino fallido sin miedo.
 *
 * Un medio que falla no frena al otro: si WhatsApp rechaza todo, el email sale
 * igual. Son avisos independientes y el paciente no tiene por qué quedarse sin
 * los dos porque uno se rompió.
 */
export class EnviarRecordatoriosProgramados {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly configRecordatorios: IConfiguracionRecordatoriosRepositorio,
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly enviarUno: EnviarRecordatorioWhatsapp,
    private readonly enviarEmail: EnviarRecordatoriosPorEmail,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(
    opciones: { ignorarHora?: boolean } = {},
  ): Promise<ResultadoProgramados> {
    const preferencias =
      (await this.configRecordatorios.obtener()) ??
      ConfiguracionRecordatorios.porDefecto();

    if (
      !opciones.ignorarHora &&
      !preferencias.correspondeALaHora(this.reloj.ahora())
    ) {
      const motivo = "No es la hora configurada para el envío.";
      return {
        corrio: false,
        motivo,
        whatsapp: medioQuieto(motivo),
        email: medioQuieto(motivo),
        enviados: 0,
      };
    }

    const whatsapp = await this.correrWhatsapp(preferencias);
    const email = await this.correrEmail(preferencias);

    return {
      corrio: true,
      motivo: null,
      whatsapp,
      email,
      enviados: whatsapp.enviados + email.enviados,
    };
  }

  private async correrEmail(
    preferencias: ConfiguracionRecordatorios,
  ): Promise<ResultadoMedio> {
    if (preferencias.diasAntesEmailAutomatico.length === 0) {
      return medioQuieto("El envío automático por email está desactivado.");
    }
    try {
      const resultado = await this.enviarEmail.ejecutar();
      return { corrio: true, motivo: null, ...resultado };
    } catch (error) {
      // Que falte la plantilla de sistema no puede llevarse puesto el envío
      // por WhatsApp, que ya salió.
      const motivo =
        error instanceof Error ? error.message : "Falló el envío por email.";
      console.error("[recordatorios] el barrido por email falló:", error);
      return { corrio: false, enviados: 0, omitidos: 0, fallidos: 0, motivo };
    }
  }

  private async correrWhatsapp(
    preferencias: ConfiguracionRecordatorios,
  ): Promise<ResultadoMedio> {
    const escalones = preferencias.diasAntesWhatsappAutomatico;
    if (escalones.length === 0) {
      return medioQuieto("El envío automático por WhatsApp está desactivado.");
    }

    const plantilla = await this.plantillas.obtenerPredeterminada();
    if (!plantilla || !plantilla.activa) {
      // Sin plantilla no se le inventa un texto al profesional para mandárselo
      // a sus pacientes en su nombre.
      return medioQuieto(
        "No hay una plantilla de WhatsApp predeterminada activa.",
      );
    }

    const hoy = this.reloj.hoy();
    // Una sola lectura para todos los escalones: el más lejano marca el borde.
    const fechas = escalones.map(
      (dias) => new Date(hoy.getTime() + dias * DIA_MS),
    );
    const turnos = await this.turnos.listarEntreFechas(
      fechas.reduce((a, b) => (a <= b ? a : b)),
      fechas.reduce((a, b) => (a >= b ? a : b)),
    );
    if (turnos.length === 0) {
      return {
        corrio: true,
        enviados: 0,
        omitidos: 0,
        fallidos: 0,
        motivo: null,
      };
    }

    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const existentes = await this.recordatorios.porTurnos(
      turnos.map((t) => t.id),
    );
    const cachePacientes = new Map<string, Paciente | null>();

    let enviados = 0;
    let omitidos = 0;
    let fallidos = 0;

    for (const dias of escalones) {
      const objetivo = new Date(hoy.getTime() + dias * DIA_MS).getTime();
      for (const turno of turnos.filter((t) => mismaFecha(t, objetivo))) {
        if (!cachePacientes.has(turno.pacienteId)) {
          cachePacientes.set(
            turno.pacienteId,
            await this.pacientes.obtenerPorId(turno.pacienteId),
          );
        }
        const paciente = cachePacientes.get(turno.pacienteId) ?? null;
        if (!paciente || paciente.estaArchivado) {
          omitidos += 1;
          continue;
        }

        const resultado = await this.enviarUno.ejecutar({
          turno,
          paciente,
          plantilla,
          configuracion: config,
          diasAntes: dias,
          origen: "AUTOMATICO",
          // Nadie apretó un botón: el log queda sin usuario, que es la verdad.
          usuarioId: null,
          existentes: existentes.get(turno.id) ?? [],
          forzar: false,
          // El barrido no necesita el margen —el índice único ya impide que un
          // escalón salga dos veces—, pero lo pasa igual por coherencia.
          horasEntreAvisos: preferencias.horasEntreAvisos,
          ahora: this.reloj.ahora(),
        });

        if (
          resultado.estado === "ENVIADO" ||
          resultado.estado === "PREPARADO"
        ) {
          enviados += 1;
          // El envío recién hecho pasa a contar como previo: sin esto, dos
          // escalones que caen el mismo día volverían a mandar.
          existentes.set(turno.id, [
            ...(existentes.get(turno.id) ?? []),
            resultado.recordatorio,
          ]);
        } else if (resultado.estado === "FALLIDO") {
          fallidos += 1;
        } else {
          omitidos += 1;
        }
      }
    }

    return { corrio: true, enviados, omitidos, fallidos, motivo: null };
  }
}

function medioQuieto(motivo: string): ResultadoMedio {
  return { corrio: false, enviados: 0, omitidos: 0, fallidos: 0, motivo };
}

/** Las fechas de turno se guardan a medianoche UTC: se comparan por instante. */
function mismaFecha(turno: Turno, objetivo: number): boolean {
  return turno.fecha.getTime() === objetivo;
}

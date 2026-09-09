import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { EstadoRecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import {
  normalizarTelefonoE164,
  PREFIJO_PAIS_POR_DEFECTO,
} from "@/dominio/servicios/telefono";

const DIA_MS = 24 * 60 * 60 * 1000;
/** Ventana por defecto de la consola: la semana que viene. */
export const DIAS_VENTANA_POR_DEFECTO = 7;
export const MAX_DIAS_VENTANA = 60;

/** Un aviso ya registrado para ese turno, tal como lo muestra la consola. */
export interface AvisoPrevio {
  id: string;
  estado: EstadoRecordatorioWhatsapp;
  /** Escalón de la programación, o null si fue un envío manual. */
  diasAntes: number | null;
  creadoEn: Date;
  respondidoEn: Date | null;
}

/** Un turno candidato a recibir recordatorio. */
export interface TurnoParaRecordar {
  turnoId: string;
  pacienteId: string;
  nombrePaciente: string;
  telefono: string | null;
  fecha: Date;
  hora: string;
  estadoTurno: EstadoTurno;
  /** Días que faltan para el turno, contados desde hoy. */
  diasFaltantes: number;
  avisos: AvisoPrevio[];
  /**
   * Ya le SALIÓ al menos un aviso. Un borrador sin confirmar no cuenta: el
   * chat se abrió y nadie sabe si el mensaje se mandó, así que ese turno sigue
   * necesitando atención, no menos.
   */
  yaAvisado: boolean;
  /** Por qué NO se le puede mandar; null si se puede. */
  impedimento: string | null;
}

/**
 * Caso de uso: los turnos más próximos con el estado de su recordatorio.
 *
 * Es lo que alimenta la consola de envío manual, y por eso ordena por cercanía
 * del turno y no por fecha de creación: la pregunta que se hace el profesional
 * al abrirla es "¿a quién tengo que avisarle ya?".
 *
 * Trae los avisos de TODOS los turnos de la ventana en una sola consulta, y
 * todos los avisos de cada turno y no solo el último: con [3, 1] programados,
 * saber que salió el de 3 días no dice nada sobre el de 1 día.
 */
export class ListarTurnosParaRecordar {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(
    dias: number = DIAS_VENTANA_POR_DEFECTO,
  ): Promise<TurnoParaRecordar[]> {
    const ventana = Math.min(Math.max(Math.trunc(dias), 0), MAX_DIAS_VENTANA);
    const hoy = this.reloj.hoy();
    const hasta = new Date(hoy.getTime() + ventana * DIA_MS);

    const turnos = (await this.turnos.listarEntreFechas(hoy, hasta)).filter(
      (turno) => turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO",
    );
    if (turnos.length === 0) return [];

    const avisosPorTurno = await this.recordatorios.porTurnos(
      turnos.map((t) => t.id),
    );
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    const prefijo = config.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;

    // Los pacientes se piden una vez cada uno: un mismo paciente puede tener
    // varios turnos en la ventana.
    const cache = new Map<string, Paciente | null>();
    const salida: TurnoParaRecordar[] = [];

    for (const turno of turnos) {
      if (!cache.has(turno.pacienteId)) {
        cache.set(
          turno.pacienteId,
          await this.pacientes.obtenerPorId(turno.pacienteId),
        );
      }
      const paciente = cache.get(turno.pacienteId) ?? null;
      if (!paciente || paciente.estaArchivado) continue;

      const avisos = (avisosPorTurno.get(turno.id) ?? []).map(
        (recordatorio): AvisoPrevio => {
          const d = recordatorio.aPrimitivos();
          return {
            id: d.id,
            estado: d.estado,
            diasAntes: d.diasAntes,
            creadoEn: d.creadoEn,
            respondidoEn: d.respondidoEn,
          };
        },
      );

      salida.push({
        turnoId: turno.id,
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombreCompleto,
        telefono: paciente.telefono
          ? normalizarTelefonoE164(paciente.telefono, prefijo)
          : null,
        fecha: turno.fecha,
        hora: turno.hora,
        estadoTurno: turno.estado,
        diasFaltantes: Math.round(
          (turno.fecha.getTime() - hoy.getTime()) / DIA_MS,
        ),
        avisos,
        yaAvisado: (avisosPorTurno.get(turno.id) ?? []).some((r) => r.salio),
        impedimento: paciente.telefono ? null : "Sin teléfono cargado.",
      });
    }

    return salida;
  }
}

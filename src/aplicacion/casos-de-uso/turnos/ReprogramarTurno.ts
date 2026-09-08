import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import { verificarDentroDeLaAgenda } from "@/dominio/servicios/agendaConsultorio";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";
import { ErrorEstablecimientoNoEncontrado } from "@/dominio/errores/ErrorEstablecimientoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Entrada del dominio para reprogramar un turno. */
export interface DatosReprogramarTurno {
  id: string;
  fecha: Date;
  hora: string;
  duracionMinutos?: number;
  /**
   * Mover el turno de sede es parte de reprogramar: "te paso al del centro" es
   * el mismo gesto que "te paso al martes". Sin esto habría que cancelar y
   * volver a agendar, y el turno perdería su historia.
   */
  establecimientoId?: string;
}

/**
 * Caso de uso: cambiar el día/hora/duración/sede de un turno.
 *
 * Verifica que el turno exista, aplica la reprogramación (la entidad valida
 * estado, hora y duración), que el nuevo horario caiga dentro de la agenda del
 * establecimiento **donde queda** el turno y que no se solape con OTRO turno de
 * esa fecha (ignorando el propio y los cancelados).
 *
 * El solapamiento se mira contra todos los turnos del día, de cualquier sede:
 * mover un turno al otro consultorio no lo saca de la agenda del profesional.
 */
export class ReprogramarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly establecimientos: IEstablecimientoRepositorio,
  ) {}

  async ejecutar(datos: DatosReprogramarTurno): Promise<Turno> {
    const turno = await this.turnos.obtenerPorId(datos.id);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(datos.id);
    }

    // La entidad valida que el estado permita reprogramar, y hora/duración.
    turno.reprogramar({
      fecha: datos.fecha,
      hora: datos.hora,
      duracionMinutos: datos.duracionMinutos,
      establecimientoId: datos.establecimientoId,
    });

    // La agenda que manda es la de la sede donde el turno QUEDA: si se lo mueve
    // al otro consultorio, se lo compara contra los días y el horario de ese.
    // Se lee después de reprogramar por eso mismo, y como la entidad es una
    // copia en memoria, un rechazo no deja nada guardado.
    const establecimiento = await this.establecimientos.obtenerPorId(
      turno.establecimientoId,
    );
    if (!establecimiento) {
      throw new ErrorEstablecimientoNoEncontrado(turno.establecimientoId);
    }
    if (datos.establecimientoId && establecimiento.estaArchivado) {
      throw new ErrorValidacion(
        `El establecimiento «${establecimiento.nombre}» está archivado: no se pueden mover turnos ahí.`,
      );
    }

    verificarDentroDeLaAgenda(establecimiento, {
      fecha: turno.fecha,
      hora: turno.hora,
      duracionMinutos: turno.duracionMinutos,
    });

    // Solapamiento con otros turnos de la fecha (excluye el propio y cancelados).
    const delDia = await this.turnos.obtenerEnFecha(turno.fecha);
    const hayConflicto = delDia
      .filter((otro) => otro.id !== turno.id && otro.estado !== "CANCELADO")
      .some((otro) => turno.seSolapaCon(otro));

    if (hayConflicto) {
      throw new ErrorTurnoConflicto(
        turno.fecha.toISOString().slice(0, 10),
        turno.hora,
      );
    }

    return this.turnos.actualizar(turno);
  }
}

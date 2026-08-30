import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { verificarDentroDeLaAgenda } from "@/dominio/servicios/agendaConsultorio";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";

/** Entrada del dominio para reprogramar un turno. */
export interface DatosReprogramarTurno {
  id: string;
  fecha: Date;
  hora: string;
  duracionMinutos?: number;
}

/**
 * Caso de uso: cambiar el día/hora/duración de un turno.
 *
 * Verifica que el turno exista, aplica la reprogramación (la entidad valida
 * estado, hora y duración), que el nuevo horario caiga dentro de la agenda
 * declarada del consultorio y que no se solape con OTRO turno de esa fecha
 * (ignorando el propio turno y los cancelados).
 */
export class ReprogramarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
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
    });

    // La agenda del consultorio: reprogramar no puede saltarse los días y el
    // horario de atención que sí respeta el alta.
    await verificarDentroDeLaAgenda(this.configuracion, {
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

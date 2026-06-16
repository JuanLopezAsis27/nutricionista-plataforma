import type { Turno, EstadoTurno } from "../entidades/Turno";

/** Criterios opcionales para listar turnos. */
export interface FiltroTurnos {
  /** Filtra por un día concreto (se compara solo la fecha). */
  fecha?: Date;
  estado?: EstadoTurno;
  pacienteId?: string;
}

/**
 * Contrato del repositorio de Turno (puerto de salida del dominio).
 *
 * Expone `obtenerEnFecha` para que el caso de uso AgendarTurno pueda
 * comprobar la regla de no solapamiento (usando Turno.seSolapaCon) sin que
 * el dominio conozca la persistencia.
 */
export interface ITurnoRepositorio {
  crear(turno: Turno): Promise<Turno>;
  actualizar(turno: Turno): Promise<Turno>;
  obtenerPorId(id: string): Promise<Turno | null>;
  /** Devuelve los turnos existentes en una fecha (para detectar conflictos). */
  obtenerEnFecha(fecha: Date): Promise<Turno[]>;
  /** Turnos de un paciente, ordenados por fecha descendente. */
  obtenerPorPaciente(pacienteId: string): Promise<Turno[]>;
  /** Listado general con filtros, ordenado por fecha y hora ascendente. */
  listar(filtro?: FiltroTurnos): Promise<Turno[]>;
}

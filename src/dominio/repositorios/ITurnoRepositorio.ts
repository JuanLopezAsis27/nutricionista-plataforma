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
  /**
   * Borra el turno definitivamente. Es la EXCEPCIÓN a la baja lógica del
   * módulo: solo para turnos cancelados sin cobro, que no son historia de
   * nada (ver `EliminarTurno`). Los recordatorios se van en cascada.
   */
  eliminar(id: string): Promise<void>;
  /** Devuelve los turnos existentes en una fecha (para detectar conflictos). */
  obtenerEnFecha(fecha: Date): Promise<Turno[]>;
  /**
   * Turnos en un rango de fechas inclusivo, ordenados por fecha y hora.
   *
   * Lo pide la consola de recordatorios, que muestra "los que tienen turno más
   * pronto": pedir día por día serían N consultas para pintar una pantalla, y
   * el barrido automático necesita el mismo rango para cubrir de una sola vez
   * todos los escalones programados.
   */
  listarEntreFechas(desde: Date, hasta: Date): Promise<Turno[]>;
  /** Turnos de un paciente, ordenados por fecha descendente. */
  obtenerPorPaciente(pacienteId: string): Promise<Turno[]>;
  /** Listado general con filtros, ordenado por fecha y hora ascendente. */
  listar(filtro?: FiltroTurnos): Promise<Turno[]>;
}

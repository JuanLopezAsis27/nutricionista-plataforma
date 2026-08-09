/** Datos de un turno necesarios para reflejarlo en el calendario externo. */
export interface DatosTurnoSync {
  id: string;
  pacienteId: string;
  fecha: Date;
  hora: string; // HH:mm
  duracionMinutos: number;
}

/**
 * Puerto de sincronización de turnos con un calendario externo (Google).
 * Lo invoca `ServicioTurno` de forma best-effort (nunca hace fallar la
 * operación del turno). La implementación es no-op si el nutricionista no tiene
 * Google conectado o si la integración no está configurada.
 */
export interface ISincronizadorCalendario {
  alAgendar(turno: DatosTurnoSync): Promise<void>;
  alReprogramar(turno: DatosTurnoSync): Promise<void>;
  alCancelar(turnoId: string): Promise<void>;
}

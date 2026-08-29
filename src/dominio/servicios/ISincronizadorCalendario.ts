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
 *
 * Lo invoca `ServicioTurno` de forma best-effort: NUNCA hace fallar la
 * operación del turno. Un turno tiene que quedar agendado aunque Google esté
 * caído; el calendario es un recordatorio más, no la fuente de verdad.
 *
 * La implementación es no-op si el nutricionista no tiene Google conectado, si
 * la integración no está configurada o si apagó el medio CALENDARIO en su
 * configuración de recordatorios.
 */
export interface ISincronizadorCalendario {
  alAgendar(turno: DatosTurnoSync): Promise<void>;
  alReprogramar(turno: DatosTurnoSync): Promise<void>;
  alCancelar(turnoId: string): Promise<void>;
}

/** Correspondencia entre un turno y su evento en el calendario externo. */
export interface SincronizacionTurno {
  cuentaId: string;
  turnoId: string;
  googleEventId: string;
}

/** Contrato de persistencia del mapeo turno ↔ evento de calendario. */
export interface ISincronizacionTurnoRepositorio {
  obtenerPorTurno(turnoId: string): Promise<SincronizacionTurno | null>;
  guardar(sincronizacion: SincronizacionTurno): Promise<void>;
  eliminarPorTurno(turnoId: string): Promise<void>;
}

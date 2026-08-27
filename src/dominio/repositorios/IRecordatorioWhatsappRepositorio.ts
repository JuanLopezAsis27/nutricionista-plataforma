import type { RecordatorioWhatsapp } from "../entidades/RecordatorioWhatsapp";

/** Contrato de persistencia del log de recordatorios por WhatsApp. */
export interface IRecordatorioWhatsappRepositorio {
  registrar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp>;
  actualizar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp>;
  obtenerPorId(id: string): Promise<RecordatorioWhatsapp | null>;
  /** Busca por el wamid de Meta (webhook de estado con la API oficial). */
  obtenerPorIdExterno(idExterno: string): Promise<RecordatorioWhatsapp | null>;
  /**
   * Último recordatorio de cada turno pedido, indexado por turnoId. Una sola
   * consulta para toda la grilla de turnos (sin N+1).
   */
  ultimosPorTurnos(turnoIds: string[]): Promise<Map<string, RecordatorioWhatsapp>>;
}

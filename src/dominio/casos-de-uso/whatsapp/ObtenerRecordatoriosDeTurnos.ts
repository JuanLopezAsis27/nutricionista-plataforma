import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";

/**
 * Caso de uso: último recordatorio de cada turno, para pintar el estado del
 * botón en la grilla. Una sola consulta para todos los turnos de la pantalla.
 */
export class ObtenerRecordatoriosDeTurnos {
  constructor(private readonly recordatorios: IRecordatorioWhatsappRepositorio) {}

  async ejecutar(turnoIds: string[]): Promise<Map<string, RecordatorioWhatsapp>> {
    if (turnoIds.length === 0) {
      return new Map();
    }
    return this.recordatorios.ultimosPorTurnos(turnoIds);
  }
}

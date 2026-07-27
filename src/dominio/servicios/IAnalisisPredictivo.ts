/** Severidad de un insight predictivo (para color/orden en la UI). */
export type SeveridadInsight = "INFO" | "ATENCION" | "CRITICO";

/** Un hallazgo del análisis predictivo (a futuro, salida de un modelo ML). */
export interface InsightPaciente {
  tipo: string;
  titulo: string;
  detalle: string;
  severidad: SeveridadInsight;
}

/**
 * Puerto de análisis predictivo para el nutricionista (predicción de
 * abandono, segmentación, tendencias…). La implementación actual es un stub
 * de demostración; a futuro, un microservicio/modelo ML que lee las tablas de
 * eventos. La UI no cambia: solo se reemplaza el adaptador.
 */
export interface IAnalisisPredictivo {
  insights(): Promise<InsightPaciente[]>;
}

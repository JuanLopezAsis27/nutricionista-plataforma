import type { AnalisisComida } from "../entidades/AnalisisComida";

/**
 * Contrato de persistencia del historial de IA.
 *
 * Hoy es solo el análisis de fotos de comida. Las preguntas al asistente
 * también vivían acá, sueltas (`ConsultaIA`); desde la migración 46 son turnos
 * de un chat y las guarda `IConversacionIARepositorio`.
 */
export interface IHistorialIARepositorio {
  guardarAnalisis(analisis: AnalisisComida): Promise<void>;
  listarAnalisis(
    pacienteId: string,
    limite?: number,
  ): Promise<AnalisisComida[]>;
}

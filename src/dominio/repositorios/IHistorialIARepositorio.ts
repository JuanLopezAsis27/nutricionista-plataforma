import type { ConsultaIA } from "../entidades/ConsultaIA";
import type { AnalisisComida } from "../entidades/AnalisisComida";

/** Contrato de persistencia del historial de IA (consultas + análisis de comida). */
export interface IHistorialIARepositorio {
  guardarConsulta(consulta: ConsultaIA): Promise<void>;
  listarConsultas(pacienteId: string, limite?: number): Promise<ConsultaIA[]>;
  guardarAnalisis(analisis: AnalisisComida): Promise<void>;
  listarAnalisis(pacienteId: string, limite?: number): Promise<AnalisisComida[]>;
}

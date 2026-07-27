import type {
  IAnalisisPredictivo,
  InsightPaciente,
} from "../../servicios/IAnalisisPredictivo";

/** Caso de uso: obtener los insights predictivos para el nutricionista. */
export class ObtenerInsightsPredictivos {
  constructor(private readonly analisis: IAnalisisPredictivo) {}

  async ejecutar(): Promise<InsightPaciente[]> {
    return this.analisis.insights();
  }
}

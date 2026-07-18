import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { PlanNutricional } from "../../entidades/PlanNutricional";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";

/** Caso de uso: obtener un plan por id (falla si no existe). */
export class ObtenerPlanPorId {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(id: string): Promise<PlanNutricional> {
    const plan = await this.planes.obtenerPorId(id);
    if (!plan) {
      throw new ErrorPlanNoEncontrado(id);
    }
    return plan;
  }
}

import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type { PlanSemanal } from "@/dominio/entidades/PlanSemanal";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";

/** Caso de uso: un plan semanal completo por id. */
export class ObtenerPlanSemanalPorId {
  constructor(private readonly planes: IPlanSemanalRepositorio) {}

  async ejecutar(id: string): Promise<PlanSemanal> {
    const plan = await this.planes.obtenerPorId(id);
    if (!plan) {
      throw new ErrorPlanSemanalNoEncontrado(id);
    }
    return plan;
  }
}

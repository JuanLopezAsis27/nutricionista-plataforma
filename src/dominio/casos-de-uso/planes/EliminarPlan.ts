import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: eliminar un plan.
 * Verifica que exista y que no tenga asignaciones activas (en ese caso
 * conviene archivarlo, no borrarlo).
 */
export class EliminarPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.planes.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPlanNoEncontrado(id);
    }

    const asignacionesActivas =
      await this.planes.contarAsignacionesActivasDePlan(id);
    if (asignacionesActivas > 0) {
      throw new ErrorValidacion(
        "No se puede eliminar un plan asignado a pacientes. Archivalo, o desasignalo primero.",
      );
    }

    await this.planes.eliminar(id);
  }
}

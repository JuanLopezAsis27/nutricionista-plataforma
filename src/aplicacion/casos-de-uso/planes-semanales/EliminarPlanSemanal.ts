import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type { IAsignacionPlanSemanalRepositorio } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: eliminar un plan semanal.
 *
 * Se niega si algún paciente lo sigue hoy: borrarlo lo dejaría sin el menú que
 * está siguiendo. Primero se lo finaliza (la asignación queda en el historial),
 * después se borra el plan.
 */
export class EliminarPlanSemanal {
  constructor(
    private readonly planes: IPlanSemanalRepositorio,
    private readonly asignaciones: IAsignacionPlanSemanalRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.planes.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPlanSemanalNoEncontrado(id);
    }

    const activas = await this.asignaciones.contarAsignacionesActivasDePlan(id);
    if (activas > 0) {
      throw new ErrorValidacion(
        "No se puede eliminar un plan semanal que algún paciente está siguiendo. Finalizalo primero.",
      );
    }

    await this.planes.eliminar(id);
  }
}

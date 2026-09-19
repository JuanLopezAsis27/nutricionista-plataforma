import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: eliminar un plan.
 * Verifica que exista y que no esté asignado a ningún paciente (en ese caso
 * conviene archivarlo, no borrarlo).
 *
 * El chequeo no es redundante con el CASCADE de la FK: la base se llevaría los
 * vínculos en silencio y varios pacientes se quedarían sin un plan que estaban
 * siguiendo. Acá se avisa antes.
 */
export class EliminarPlan {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.planes.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPlanNoEncontrado(id);
    }

    const asignados = await this.asignaciones.contarAsignacionesDePlan(id);
    if (asignados > 0) {
      throw new ErrorValidacion(
        "No se puede eliminar un plan asignado a pacientes. Archivalo, o desasignalo primero.",
      );
    }

    await this.planes.eliminar(id);
  }
}

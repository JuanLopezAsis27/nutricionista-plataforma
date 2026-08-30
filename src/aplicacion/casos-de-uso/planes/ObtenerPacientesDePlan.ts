import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionConPaciente,
} from "@/dominio/repositorios/IPlanRepositorio";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";

/**
 * Caso de uso: pacientes que tienen —o tuvieron— este plan asignado.
 *
 * Devuelve las asignaciones enteras, activas e históricas, y no solo los ids:
 * la pantalla del plan necesita saber desde cuándo lo sigue cada uno y quiénes
 * ya lo dejaron. Devolver solo los activos escondería que el plan se usó.
 */
export class ObtenerPacientesDePlan {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
  ) {}

  async ejecutar(planId: string): Promise<AsignacionConPaciente[]> {
    const plan = await this.planes.obtenerPorId(planId);
    if (!plan) {
      throw new ErrorPlanNoEncontrado(planId);
    }
    return this.asignaciones.listarAsignacionesDePlan(planId);
  }
}

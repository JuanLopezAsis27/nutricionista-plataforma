import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionConPaciente,
} from "@/dominio/repositorios/IPlanRepositorio";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";

/**
 * Caso de uso: pacientes que tienen este plan asignado.
 *
 * Devuelve las asignaciones enteras y no solo los ids de paciente: la pantalla
 * del plan muestra nombre y apellido, y resolverlos aparte sería una consulta
 * por fila.
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

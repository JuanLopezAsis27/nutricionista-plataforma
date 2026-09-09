import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type {
  IAsignacionPlanSemanalRepositorio,
  AsignacionSemanalConPaciente,
} from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";

/** Caso de uso: pacientes que tienen —o tuvieron— este plan semanal. */
export class ObtenerPacientesDePlanSemanal {
  constructor(
    private readonly planes: IPlanSemanalRepositorio,
    private readonly asignaciones: IAsignacionPlanSemanalRepositorio,
  ) {}

  async ejecutar(
    planSemanalId: string,
  ): Promise<AsignacionSemanalConPaciente[]> {
    const plan = await this.planes.obtenerPorId(planSemanalId);
    if (!plan) {
      throw new ErrorPlanSemanalNoEncontrado(planSemanalId);
    }
    return this.asignaciones.listarAsignacionesDePlan(planSemanalId);
  }
}

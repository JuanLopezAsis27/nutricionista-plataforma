import type {
  IAsignacionPlanificacionRepositorio,
  AsignacionConPaciente,
} from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";

/** Caso de uso: a qué pacientes está asignada una planificación, y para qué competencia. */
export class ObtenerPacientesDePlanificacion {
  constructor(
    private readonly asignaciones: IAsignacionPlanificacionRepositorio,
  ) {}

  ejecutar(planificacionId: string): Promise<AsignacionConPaciente[]> {
    return this.asignaciones.listarDePlanificacion(planificacionId);
  }
}

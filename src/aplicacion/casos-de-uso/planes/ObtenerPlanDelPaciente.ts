import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";

/** Caso de uso: plan activo de un paciente (o null si no tiene). */
export class ObtenerPlanDelPaciente {
  constructor(private readonly planes: IAsignacionPlanRepositorio) {}

  async ejecutar(pacienteId: string): Promise<PlanNutricional | null> {
    return this.planes.obtenerPlanActivoDePaciente(pacienteId);
  }
}

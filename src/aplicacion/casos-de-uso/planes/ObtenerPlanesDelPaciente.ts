import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";

/**
 * Caso de uso: los planes que un paciente tiene asignados (puede no tener
 * ninguno, uno o varios).
 *
 * Devuelve una lista y no "el plan activo": ninguno rige sobre los otros, así
 * que elegir uno acá sería una decisión inventada en la lectura.
 */
export class ObtenerPlanesDelPaciente {
  constructor(private readonly asignaciones: IAsignacionPlanRepositorio) {}

  async ejecutar(pacienteId: string): Promise<PlanNutricional[]> {
    return this.asignaciones.listarPlanesDePaciente(pacienteId);
  }
}

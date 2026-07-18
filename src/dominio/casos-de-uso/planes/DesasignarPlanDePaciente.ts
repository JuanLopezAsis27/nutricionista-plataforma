import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";

/** Caso de uso: finalizar el plan activo de un paciente (queda sin plan). */
export class DesasignarPlanDePaciente {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(pacienteId: string): Promise<void> {
    await this.planes.desactivarAsignacionesDe(pacienteId);
  }
}

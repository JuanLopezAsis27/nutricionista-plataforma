import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";

/**
 * Caso de uso: finalizar el plan activo de un paciente (queda sin plan).
 *
 * No borra nada: cierra la asignación con la fecha de hoy y la deja en el
 * historial. Que el paciente haya seguido ese plan entre esas fechas es
 * información clínica, y desaparece solo si se borra al paciente.
 */
export class DesasignarPlanDePaciente {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(pacienteId: string, ahora: Date = new Date()): Promise<void> {
    await this.planes.desactivarAsignacionesDe(pacienteId, ahora);
  }
}

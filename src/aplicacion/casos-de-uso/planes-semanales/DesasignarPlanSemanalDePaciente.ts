import type { IAsignacionPlanSemanalRepositorio } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";

/**
 * Caso de uso: finalizar el plan semanal activo de un paciente.
 *
 * No borra nada: cierra la asignación con la fecha de hoy y la deja en el
 * historial, igual que con el plan nutricional.
 */
export class DesasignarPlanSemanalDePaciente {
  constructor(
    private readonly asignaciones: IAsignacionPlanSemanalRepositorio,
  ) {}

  async ejecutar(pacienteId: string, ahora: Date = new Date()): Promise<void> {
    await this.asignaciones.desactivarAsignacionesDe(pacienteId, ahora);
  }
}

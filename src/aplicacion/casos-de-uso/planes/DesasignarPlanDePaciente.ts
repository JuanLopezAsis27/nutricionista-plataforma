import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";

/** Entrada: qué plan sacarle a qué paciente. */
export interface DatosDesasignarPlan {
  planId: string;
  pacienteId: string;
}

/**
 * Caso de uso: sacarle UN plan a un paciente.
 *
 * Nombra el plan porque el paciente puede tener varios: "el plan del paciente"
 * dejó de ser una cosa sola. Los demás siguen asignados.
 *
 * Borra el vínculo, no el plan: el plan sigue en el consultorio para asignarlo
 * a quien sea. Desasignar dos veces no falla —no queda nada que borrar—.
 *
 * **La fecha viaja desde acá**, no la pone la base: el repositorio la guarda en
 * `desasignaciones_plan` junto con el nombre que el plan tenía en ese momento.
 * Nadie muestra ese registro, pero qué plan siguió un paciente y hasta cuándo
 * es información clínica y no se puede reconstruir más tarde.
 */
export class DesasignarPlanDePaciente {
  constructor(private readonly asignaciones: IAsignacionPlanRepositorio) {}

  async ejecutar(
    datos: DatosDesasignarPlan,
    ahora: Date = new Date(),
  ): Promise<void> {
    await this.asignaciones.desasignarDePaciente(
      datos.planId,
      datos.pacienteId,
      ahora,
    );
  }
}

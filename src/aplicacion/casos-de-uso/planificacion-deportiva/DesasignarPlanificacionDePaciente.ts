import type { IAsignacionPlanificacionRepositorio } from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";

/**
 * Caso de uso: sacarle una planificación a un paciente. Borra el vínculo (deja
 * de verla en su portal); la planificación sigue en su carpeta.
 */
export class DesasignarPlanificacionDePaciente {
  constructor(
    private readonly asignaciones: IAsignacionPlanificacionRepositorio,
  ) {}

  async ejecutar(planificacionId: string, pacienteId: string): Promise<void> {
    const asignacion = await this.asignaciones.obtenerAsignacion(
      planificacionId,
      pacienteId,
    );
    if (!asignacion) throw new ErrorPlanificacionNoEncontrada(planificacionId);
    await this.asignaciones.desasignar(planificacionId, pacienteId);
  }
}

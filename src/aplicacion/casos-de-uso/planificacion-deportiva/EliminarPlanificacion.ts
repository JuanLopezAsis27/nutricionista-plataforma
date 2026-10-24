import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";

/**
 * Caso de uso: borrar una planificación. Se lleva sus ingestas y sus
 * asignaciones (cascada): deja de aparecer en el portal de los pacientes que
 * la tenían. Sus competencias quedan intactas: son del calendario del
 * paciente, no de la planificación.
 */
export class EliminarPlanificacion {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    if (!(await this.planificaciones.obtenerPorId(id))) {
      throw new ErrorPlanificacionNoEncontrada(id);
    }
    await this.planificaciones.eliminar(id);
  }
}

import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { PlanificacionDeportiva } from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";

/** Caso de uso: una planificación del consultorio, entera. */
export class ObtenerPlanificacionPorId {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
  ) {}

  async ejecutar(id: string): Promise<PlanificacionDeportiva> {
    const planificacion = await this.planificaciones.obtenerPorId(id);
    if (!planificacion) throw new ErrorPlanificacionNoEncontrada(id);
    return planificacion;
  }
}

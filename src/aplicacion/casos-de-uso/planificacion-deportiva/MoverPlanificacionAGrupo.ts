import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";
import { ErrorGrupoPlanNoEncontrado } from "@/dominio/errores/ErrorGrupoPlanNoEncontrado";

/**
 * Caso de uso: mover una planificación a una carpeta (o sacarla, con null).
 * Aparte de editar por lo mismo que en los planes: ordenar no es editar, y no
 * tiene por qué reescribir las ingestas para cambiar un solo campo.
 */
export class MoverPlanificacionAGrupo {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
    private readonly grupos: IGrupoPlanRepositorio,
  ) {}

  async ejecutar(
    planificacionId: string,
    grupoId: string | null,
  ): Promise<void> {
    if (!(await this.planificaciones.obtenerPorId(planificacionId))) {
      throw new ErrorPlanificacionNoEncontrada(planificacionId);
    }
    if (grupoId !== null && !(await this.grupos.obtenerPorId(grupoId))) {
      throw new ErrorGrupoPlanNoEncontrado(grupoId);
    }
    await this.planificaciones.moverAGrupo(planificacionId, grupoId);
  }
}

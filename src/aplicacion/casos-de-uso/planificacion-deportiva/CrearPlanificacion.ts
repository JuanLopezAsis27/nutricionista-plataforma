import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import {
  PlanificacionDeportiva,
  type DatosNuevaPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorPlanificacionDuplicada } from "@/dominio/errores/ErrorPlanificacionDuplicada";
import { ErrorGrupoPlanNoEncontrado } from "@/dominio/errores/ErrorGrupoPlanNoEncontrado";

/**
 * Caso de uso: crear una planificación deportiva GENERAL (sin paciente), en
 * la raíz o en una carpeta. Para crearla desde la ficha de un paciente, ver
 * `CrearPlanificacionParaPaciente`.
 *
 * El nombre no se repite: es lo que se ve al elegir una para asignar.
 */
export class CrearPlanificacion {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
    private readonly grupos: IGrupoPlanRepositorio,
  ) {}

  async ejecutar(
    datos: DatosNuevaPlanificacion,
  ): Promise<PlanificacionDeportiva> {
    const planificacion = PlanificacionDeportiva.crear(
      datos,
      crypto.randomUUID(),
      () => crypto.randomUUID(),
    );
    if (await this.planificaciones.existeNombre(planificacion.nombre)) {
      throw new ErrorPlanificacionDuplicada(planificacion.nombre);
    }
    // La FK la rechazaría igual, pero como error de base y no como «esa
    // carpeta no existe».
    if (
      planificacion.grupoId &&
      !(await this.grupos.obtenerPorId(planificacion.grupoId))
    ) {
      throw new ErrorGrupoPlanNoEncontrado(planificacion.grupoId);
    }
    return this.planificaciones.crear(planificacion);
  }
}

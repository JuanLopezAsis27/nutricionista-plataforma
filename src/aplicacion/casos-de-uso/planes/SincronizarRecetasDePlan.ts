import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";

/**
 * Caso de uso: comparte con quienes siguen HOY este plan cada receta usada en
 * alguna de sus franjas, para que aparezca en su portal (Mis recetas).
 *
 * Se dispara al guardar el plan (una franja pudo sumar una receta nueva) y al
 * asignarlo a un paciente (empieza a seguir un plan que ya tenía recetas
 * cargadas). Es acumulativo a propósito: sacar una receta de una franja no
 * desasigna nada acá, porque pudo llegar también por otra vía (Biblioteca) y
 * esta sincronización no tiene forma de distinguir el origen.
 */
export class SincronizarRecetasDePlan {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
    private readonly recetas: IRecetaRepositorio,
  ) {}

  async ejecutar(planId: string): Promise<void> {
    const plan = await this.planes.obtenerPorId(planId);
    if (!plan) {
      throw new ErrorPlanNoEncontrado(planId);
    }

    const recetaIds = new Set<string>();
    for (const comida of plan.comidas) {
      for (const opcion of comida.opciones) {
        if (opcion.recetaId) recetaIds.add(opcion.recetaId);
      }
    }
    // Las vinculadas directamente al plan (sin franja) son el único camino en
    // un plan PDF/Word, que no tiene franjas de las que colgar una opción.
    for (const vinculo of plan.recetasVinculadas) {
      recetaIds.add(vinculo.recetaId);
    }
    if (recetaIds.size === 0) return;

    const pacientesActivos = (
      await this.asignaciones.listarAsignacionesDePlan(planId)
    ).filter((asignacion) => asignacion.activa);

    for (const asignacion of pacientesActivos) {
      for (const recetaId of recetaIds) {
        await this.recetas.asignarAPaciente(
          recetaId,
          asignacion.pacienteId,
          crypto.randomUUID(),
        );
      }
    }
  }
}

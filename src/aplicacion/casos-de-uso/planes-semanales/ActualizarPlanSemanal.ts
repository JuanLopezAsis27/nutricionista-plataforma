import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type {
  PlanSemanal,
  DatosNuevoPlanSemanal,
} from "@/dominio/entidades/PlanSemanal";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";
import { ErrorPlanSemanalDuplicado } from "@/dominio/errores/ErrorPlanSemanalDuplicado";

/** Datos de entrada: id + la grilla completa (reemplaza a la anterior). */
export interface DatosActualizarPlanSemanal extends DatosNuevoPlanSemanal {
  id: string;
}

/**
 * Caso de uso: actualizar un plan semanal. Reemplaza franjas, comidas y
 * alimentos: quien edita manda la grilla que quiere que quede.
 */
export class ActualizarPlanSemanal {
  constructor(private readonly planes: IPlanSemanalRepositorio) {}

  async ejecutar(datos: DatosActualizarPlanSemanal): Promise<PlanSemanal> {
    const existente = await this.planes.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorPlanSemanalNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos, () => crypto.randomUUID());

    // `excluirId` es lo que deja guardar sin renombrar: si no, el plan chocaría
    // contra su propio nombre cada vez que se edita cualquier otra cosa.
    if (await this.planes.existeNombre(actualizado.nombre, actualizado.id)) {
      throw new ErrorPlanSemanalDuplicado(actualizado.nombre);
    }

    return this.planes.actualizar(actualizado);
  }
}

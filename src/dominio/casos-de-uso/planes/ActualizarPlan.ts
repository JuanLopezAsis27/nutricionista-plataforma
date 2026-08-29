import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type {
  PlanNutricional,
  DatosNuevoPlan,
} from "../../entidades/PlanNutricional";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorPlanDuplicado } from "../../errores/ErrorPlanDuplicado";
import { idsDeArchivos } from "./CrearPlan";

/** Datos de entrada: id + contenido completo del plan (reemplaza los hijos). */
export interface DatosActualizarPlan extends Omit<
  DatosNuevoPlan,
  "esPlantilla" | "planOrigenId"
> {
  id: string;
  /** Archivos que quedan vinculados. Lo que no esté acá se desvincula. */
  archivoIds?: string[];
}

/**
 * Caso de uso: actualizar un plan (reemplaza franjas, opciones,
 * equivalencias, recomendaciones y archivos; preserva esPlantilla, origen y
 * archivado).
 */
export class ActualizarPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosActualizarPlan): Promise<PlanNutricional> {
    const existente = await this.planes.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorPlanNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos, () => crypto.randomUUID());

    // `excluirId` es lo que deja guardar sin renombrar: si no, un plan chocaría
    // contra su propio nombre cada vez que se edita cualquier otra cosa.
    if (
      await this.planes.existeNombre(
        actualizado.nombre,
        actualizado.esPlantilla,
        actualizado.id,
      )
    ) {
      throw new ErrorPlanDuplicado(actualizado.nombre, actualizado.esPlantilla);
    }

    return this.planes.actualizar(actualizado, idsDeArchivos(datos));
  }
}

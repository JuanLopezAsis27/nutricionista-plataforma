import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type {
  PlanNutricional,
  DatosNuevoPlan,
} from "../../entidades/PlanNutricional";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";

/** Datos de entrada: id + contenido completo del plan (reemplaza los hijos). */
export interface DatosActualizarPlan
  extends Omit<DatosNuevoPlan, "esPlantilla" | "planOrigenId"> {
  id: string;
}

/**
 * Caso de uso: actualizar un plan (reemplaza franjas, opciones,
 * equivalencias y recomendaciones; preserva esPlantilla, origen y archivado).
 */
export class ActualizarPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosActualizarPlan): Promise<PlanNutricional> {
    const existente = await this.planes.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorPlanNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos, () => crypto.randomUUID());
    return this.planes.actualizar(actualizado);
  }
}

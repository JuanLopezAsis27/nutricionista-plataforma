import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { PlanNutricional } from "../../entidades/PlanNutricional";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";

/** Entrada: plantilla (o plan) de origen y ajustes del clon. */
export interface DatosCrearDesdePlantilla {
  planOrigenId: string;
  nombre?: string | null;
  /** true = duplicar como plantilla; false (default) = plan para asignar. */
  esPlantilla?: boolean;
}

/**
 * Caso de uso: crear un plan como clon profundo de otro (plantilla → plan
 * personalizado, o duplicado de plantilla). El clon guarda planOrigenId.
 */
export class CrearPlanDesdePlantilla {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosCrearDesdePlantilla): Promise<PlanNutricional> {
    const origen = await this.planes.obtenerPorId(datos.planOrigenId);
    if (!origen) {
      throw new ErrorPlanNoEncontrado(datos.planOrigenId);
    }
    const clon = origen.clonar(crypto.randomUUID(), () => crypto.randomUUID(), {
      nombre: datos.nombre ?? undefined,
      esPlantilla: datos.esPlantilla ?? false,
    });
    return this.planes.crear(clon);
  }
}

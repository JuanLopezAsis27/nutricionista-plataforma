import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import {
  PlanNutricional,
  type DatosNuevoPlan,
} from "../../entidades/PlanNutricional";
import { ErrorPlanDuplicado } from "../../errores/ErrorPlanDuplicado";

/** Datos de entrada: el plan + ids de los archivos ya subidos al bucket. */
export interface DatosCrearPlan extends DatosNuevoPlan {
  /** Archivos a vincular: el principal (modalidad PDF) y/o los anexos. */
  archivoIds?: string[];
}

/**
 * Caso de uso: crear un plan nutricional (plantilla o plan suelto), en
 * cualquiera de las dos modalidades.
 *
 * Los archivos se suben antes (módulo Archivos) y acá solo se vinculan. El
 * principal se incluye en la lista aunque venga también en `archivoPrincipalId`:
 * ser el plan no lo exime de estar vinculado a él.
 */
export class CrearPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosCrearPlan): Promise<PlanNutricional> {
    const plan = PlanNutricional.crear(datos, crypto.randomUUID(), () =>
      crypto.randomUUID(),
    );

    // El índice único de la base es la garantía dura; esto es para que el
    // profesional lea "ya existe un plan llamado X" y no un error de Prisma.
    if (await this.planes.existeNombre(plan.nombre, plan.esPlantilla)) {
      throw new ErrorPlanDuplicado(plan.nombre, plan.esPlantilla);
    }

    return this.planes.crear(plan, idsDeArchivos(datos));
  }
}

/** Ids a vincular, con el principal incluido y sin repetidos. */
export function idsDeArchivos(datos: {
  archivoIds?: string[];
  archivoPrincipalId?: string | null;
}): string[] {
  const ids = new Set(datos.archivoIds ?? []);
  if (datos.archivoPrincipalId) ids.add(datos.archivoPrincipalId);
  return [...ids];
}

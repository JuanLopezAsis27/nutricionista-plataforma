import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import {
  PlanSemanal,
  type DatosNuevoPlanSemanal,
} from "@/dominio/entidades/PlanSemanal";
import { ErrorPlanSemanalDuplicado } from "@/dominio/errores/ErrorPlanSemanalDuplicado";

/** Caso de uso: crear un plan semanal de referencia. */
export class CrearPlanSemanal {
  constructor(private readonly planes: IPlanSemanalRepositorio) {}

  async ejecutar(datos: DatosNuevoPlanSemanal): Promise<PlanSemanal> {
    const plan = PlanSemanal.crear(datos, crypto.randomUUID(), () =>
      crypto.randomUUID(),
    );

    // El índice único de la base es la garantía dura; esto es para que el
    // profesional lea «ya existe un plan semanal llamado X» y no un error de
    // Prisma.
    if (await this.planes.existeNombre(plan.nombre)) {
      throw new ErrorPlanSemanalDuplicado(plan.nombre);
    }

    return this.planes.crear(plan);
  }
}

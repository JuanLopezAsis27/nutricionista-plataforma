import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import {
  PlanNutricional,
  type DatosNuevoPlan,
} from "../../entidades/PlanNutricional";

/** Caso de uso: crear un plan nutricional (plantilla o plan suelto). */
export class CrearPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: DatosNuevoPlan): Promise<PlanNutricional> {
    const plan = PlanNutricional.crear(
      datos,
      crypto.randomUUID(),
      () => crypto.randomUUID(),
    );
    return this.planes.crear(plan);
  }
}

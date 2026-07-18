import type {
  IPlanRepositorio,
  FiltroPlanes,
} from "../../repositorios/IPlanRepositorio";
import type { PlanNutricional } from "../../entidades/PlanNutricional";

/** Caso de uso: listar planes nutricionales, con filtro opcional. */
export class ObtenerPlanes {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(filtro?: FiltroPlanes): Promise<PlanNutricional[]> {
    return this.planes.listar(filtro);
  }
}

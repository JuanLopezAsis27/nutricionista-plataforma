import type {
  IPlanRepositorio,
  FiltroPlanes,
} from "@/dominio/repositorios/IPlanRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";

/** Caso de uso: listar planes nutricionales, con filtro opcional. */
export class ObtenerPlanes {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(filtro?: FiltroPlanes): Promise<PlanNutricional[]> {
    return this.planes.listar(filtro);
  }
}

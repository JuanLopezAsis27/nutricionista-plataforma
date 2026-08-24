import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { PlanNutricional } from "../../entidades/PlanNutricional";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroPlanesPaginado extends ParametrosPagina {
  esPlantilla?: boolean;
  incluirArchivados?: boolean;
  texto?: string;
}

/**
 * Caso de uso: listar planes nutricionales paginados (server-side). Trae SOLO
 * la página pedida y el total.
 */
export class ObtenerPlanesPaginado {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(filtro: FiltroPlanesPaginado): Promise<Pagina<PlanNutricional>> {
    const base = {
      esPlantilla: filtro.esPlantilla,
      incluirArchivados: filtro.incluirArchivados,
      texto: filtro.texto,
    };
    const [items, total] = await Promise.all([
      this.planes.listar({
        ...base,
        limite: filtro.porPagina,
        desplazamiento: desplazamientoDe(filtro),
      }),
      this.planes.contar(base),
    ]);
    return { items, total, paginas: totalPaginas(total, filtro.porPagina) };
  }
}

import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
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
  /** Carpeta: `null` pide los SUELTOS, ausente no filtra por carpeta. */
  grupoId?: string | null;
}

/**
 * Caso de uso: listar planes nutricionales paginados (server-side). Trae SOLO
 * la página pedida y el total.
 */
export class ObtenerPlanesPaginado {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(
    filtro: FiltroPlanesPaginado,
  ): Promise<Pagina<PlanNutricional>> {
    // Se enumera campo por campo para no arrastrar la paginación al `contar`,
    // que cuenta el total y no la página. Cada filtro nuevo hay que sumarlo
    // ACÁ además de en el DTO: `grupoId` se agregó al DTO y al repositorio, y
    // como no estaba en esta lista el filtro por carpeta no hacía nada.
    const base = {
      esPlantilla: filtro.esPlantilla,
      incluirArchivados: filtro.incluirArchivados,
      texto: filtro.texto,
      grupoId: filtro.grupoId,
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

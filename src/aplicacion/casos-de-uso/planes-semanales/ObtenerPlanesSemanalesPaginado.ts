import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type { PlanSemanal } from "@/dominio/entidades/PlanSemanal";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroPlanesSemanalesPaginado extends ParametrosPagina {
  texto?: string;
}

/**
 * Caso de uso: listar planes semanales paginados (server-side). Trae SOLO la
 * página pedida y el total.
 *
 * El filtro se enumera campo por campo, igual que en `ObtenerPlanesPaginado`, y
 * por el mismo motivo: para no arrastrar la paginación al `contar`. Un filtro
 * nuevo hay que sumarlo ACÁ además de en el DTO y en el repositorio, o se
 * descarta en silencio.
 */
export class ObtenerPlanesSemanalesPaginado {
  constructor(private readonly planes: IPlanSemanalRepositorio) {}

  async ejecutar(
    filtro: FiltroPlanesSemanalesPaginado,
  ): Promise<Pagina<PlanSemanal>> {
    const base = { texto: filtro.texto };
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

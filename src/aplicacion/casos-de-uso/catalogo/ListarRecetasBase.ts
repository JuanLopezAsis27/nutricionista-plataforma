import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroRecetasBasePaginado extends ParametrosPagina {
  texto?: string;
  etiqueta?: string;
}

/** Caso de uso: el catálogo de recetas, paginado y con búsqueda. */
export class ListarRecetasBase {
  constructor(private readonly recetas: IRecetaBaseRepositorio) {}

  /** Las etiquetas del catálogo, para ofrecerlas como filtro. */
  etiquetas(): Promise<string[]> {
    return this.recetas.listarEtiquetas();
  }

  async ejecutar(filtro: FiltroRecetasBasePaginado): Promise<Pagina<Receta>> {
    // Enumerados a mano: lo que no esté acá se descarta en silencio.
    const base = { texto: filtro.texto, etiqueta: filtro.etiqueta };
    const [items, total] = await Promise.all([
      this.recetas.listar({
        ...base,
        limite: filtro.porPagina,
        desplazamiento: desplazamientoDe(filtro),
      }),
      this.recetas.contar(base),
    ]);
    return { items, total, paginas: totalPaginas(total, filtro.porPagina) };
  }
}

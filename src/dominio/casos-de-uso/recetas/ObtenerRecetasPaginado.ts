import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { Receta } from "../../entidades/Receta";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroRecetasPaginado extends ParametrosPagina {
  texto?: string;
  etiqueta?: string;
}

/**
 * Caso de uso: listar recetas del recetario paginadas (server-side). Trae SOLO
 * la página pedida y el total, para no cargar toda la tabla.
 */
export class ObtenerRecetasPaginado {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(filtro: FiltroRecetasPaginado): Promise<Pagina<Receta>> {
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

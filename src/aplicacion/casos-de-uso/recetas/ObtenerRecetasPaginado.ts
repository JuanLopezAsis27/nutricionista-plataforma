import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroRecetasPaginado extends ParametrosPagina {
  texto?: string;
  etiqueta?: string;
  /** null lista las SUELTAS; ausente no filtra por carpeta. */
  grupoId?: string | null;
}

/**
 * Caso de uso: listar recetas del recetario paginadas (server-side). Trae SOLO
 * la página pedida y el total, para no cargar toda la tabla.
 */
export class ObtenerRecetasPaginado {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(filtro: FiltroRecetasPaginado): Promise<Pagina<Receta>> {
    // Los campos se enumeran a mano: lo que no esté acá se descarta EN
    // SILENCIO, sin error ni aviso. Es el mismo lugar donde el listado de
    // planes perdió un filtro que ya estaba en el DTO y en el repositorio.
    const base = {
      texto: filtro.texto,
      etiqueta: filtro.etiqueta,
      grupoId: filtro.grupoId,
    };
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

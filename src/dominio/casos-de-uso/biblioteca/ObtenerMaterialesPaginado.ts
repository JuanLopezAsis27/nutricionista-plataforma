import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import type { MaterialBiblioteca } from "../../entidades/MaterialBiblioteca";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

export interface FiltroMaterialesPaginado extends ParametrosPagina {
  texto?: string;
  categoria?: string;
  etiqueta?: string;
}

/**
 * Caso de uso: listar los materiales de la biblioteca paginados (server-side).
 * Trae SOLO la página pedida y el total.
 */
export class ObtenerMaterialesPaginado {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(filtro: FiltroMaterialesPaginado): Promise<Pagina<MaterialBiblioteca>> {
    const base = { texto: filtro.texto, categoria: filtro.categoria, etiqueta: filtro.etiqueta };
    const [items, total] = await Promise.all([
      this.materiales.listar({
        ...base,
        limite: filtro.porPagina,
        desplazamiento: desplazamientoDe(filtro),
      }),
      this.materiales.contar(base),
    ]);
    return { items, total, paginas: totalPaginas(total, filtro.porPagina) };
  }
}

/** Utilidades de paginación server-side compartidas por los casos de uso. */

/** Parámetros de paginación (1-indexado). */
export interface ParametrosPagina {
  pagina: number;
  porPagina: number;
}

/** Resultado paginado genérico. */
export interface Pagina<T> {
  items: T[];
  total: number;
  paginas: number;
}

/** Offset (0-indexado) a partir de la página y el tamaño. */
export function desplazamientoDe({ pagina, porPagina }: ParametrosPagina): number {
  return Math.max(0, (pagina - 1) * porPagina);
}

/** Cantidad de páginas para un total (mínimo 1). */
export function totalPaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

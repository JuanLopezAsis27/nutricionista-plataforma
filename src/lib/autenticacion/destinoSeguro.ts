/** A dónde va quien no pidió un destino válido. */
export const DESTINO_POR_DEFECTO = "/dashboard";

/**
 * A dónde volver después de renovar la sesión: solo una ruta de la app.
 *
 * El valor llega en la query, así que lo elige quien arma el enlace: si se
 * usara tal cual, `/api/autenticacion/renovar?destino=https://otro-sitio` sería
 * un redirector abierto con la marca del consultorio —y de los que además
 * entregan al visitante recién autenticado—.
 *
 * No alcanza con mirar el texto («empieza con una barra y no con dos»): el
 * parser de URL trata `\` como `/` y descarta tabs y saltos de línea, así que
 * `/\otro-sitio` y `/<TAB>/otro-sitio` llegan como `//otro-sitio`, que es un
 * host. Por eso se RESUELVE contra la base y se compara el origen: la decisión
 * la toma el mismo parser que después arma el `Location`.
 *
 * Devuelve la ruta relativa (path, query y hash), nunca la URL absoluta.
 */
export function destinoSeguro(
  pedido: string | null | undefined,
  base: string,
): string {
  if (!pedido || !pedido.startsWith("/")) return DESTINO_POR_DEFECTO;
  try {
    const origen = new URL(base).origin;
    const resuelto = new URL(pedido, origen);
    if (resuelto.origin !== origen) return DESTINO_POR_DEFECTO;
    return `${resuelto.pathname}${resuelto.search}${resuelto.hash}`;
  } catch {
    return DESTINO_POR_DEFECTO;
  }
}

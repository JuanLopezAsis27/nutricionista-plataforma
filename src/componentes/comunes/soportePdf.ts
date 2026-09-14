"use client";

import { useSyncExternalStore } from "react";

/**
 * ¿Este navegador sabe dibujar un PDF adentro de la página?
 *
 * No todos. **Chrome en Android no trae visor de PDF embebido**, y el WebView
 * de Android tampoco (es donde corre la app de la tienda, ver `docs/MOBILE.md`).
 * En esos casos el `<iframe>` con el PDF no queda vacío: muestra el cartel de
 * error del propio navegador, que es lo que se veía «en algunos celulares».
 *
 * Preguntarlo antes de embeber es la única forma de reemplazar ese cartel por
 * algo que sirva. **No alcanza con `onError` del iframe**: ese evento es del
 * ELEMENTO —se dispara si el frame no carga— y acá el frame carga perfecto; lo
 * que falla es el visor de adentro, que no avisa nada hacia afuera. Por eso el
 * `fallo` que tenía `VisorArchivo` no se activaba nunca.
 */

/**
 * Lo que se le pregunta al navegador. Se recibe por parámetro —en vez de leer
 * `window`— para poder probar cada plataforma sin simular un navegador entero.
 */
export interface NavegadorConsultado {
  pdfViewerEnabled?: boolean;
  mimeTypes?: object;
  userAgent?: string;
}

/** La regla, sin estado ni `window`. */
export function dibujaPdf(navegador: NavegadorConsultado): boolean {
  // La propiedad estándar, y la respuesta directa donde existe (Chrome 94+,
  // Firefox 94+, Safari 16.4+). En Chrome de Android devuelve `false`.
  if (typeof navegador.pdfViewerEnabled === "boolean") {
    return navegador.pdfViewerEnabled;
  }

  // Antes de esa propiedad, la misma pregunta se hacía al registro de plugins.
  if (navegador.mimeTypes && "application/pdf" in navegador.mimeTypes) {
    return true;
  }

  // Sin ninguna de las dos no queda más que la plataforma. Se asume que SÍ en
  // escritorio —donde el visor embebido es universal desde hace años— y que NO
  // en un teléfono, que es el caso que este módulo existe para atrapar.
  return !/android|iphone|ipad|ipod/i.test(navegador.userAgent ?? "");
}

/** La respuesta, calculada una sola vez por carga. */
let respuesta: boolean | null = null;

function leer(): boolean {
  respuesta ??= dibujaPdf(window.navigator);
  return respuesta;
}

/**
 * En el servidor se contesta que SÍ.
 *
 * Es la respuesta que hace coincidir el primer render del cliente con el del
 * servidor en el caso mayoritario, y la que se corrige sola —sin parpadeo
 * visible— en el teléfono, porque `useSyncExternalStore` vuelve a leer al
 * hidratar. Al revés (asumir que no) un escritorio mostraría por un instante el
 * cartel de "no se puede ver acá".
 */
function leerEnServidor(): boolean {
  return true;
}

/** Nada cambia después de la carga: no hay a qué suscribirse. */
function suscribir(): () => void {
  return () => {};
}

export function useNavegadorDibujaPdf(): boolean {
  return useSyncExternalStore(suscribir, leer, leerEnServidor);
}

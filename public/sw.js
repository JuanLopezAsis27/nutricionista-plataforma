/* eslint-disable no-undef */
/**
 * Service worker de la PWA.
 *
 * Está escrito a mano y no con `next-pwa`/Workbox a propósito: esas librerías
 * precachean TODO el shell —incluidas las páginas ya renderizadas— y en una app
 * con datos clínicos eso es un problema, no una optimización (ver más abajo).
 * Lo que hace falta acá es poco y cabe en un archivo.
 *
 * Su razón de ser es doble:
 *   1. Chrome exige un service worker con manejador de `fetch` para ofrecer
 *      "Instalar". Sin esto, el manifiesto solo no alcanza.
 *   2. Da una pantalla decente sin conexión en lugar del dinosaurio del
 *      navegador, que dentro de una ventana `standalone` se ve roto.
 *
 * ⚠️ NUNCA cachear respuestas HTML de las páginas ni nada de `/api/*`.
 * Todas las pantallas dependen de la sesión: guardarlas en el Cache Storage
 * dejaría la ficha de un paciente accesible en el disco después de cerrar
 * sesión, y visible para quien abra la app en un dispositivo compartido. El
 * Cache Storage no se limpia al desloguearse. Solo se cachea lo que es igual
 * para todo el mundo: los assets con hash de Next y los íconos.
 *
 * Ver `docs/PWA.md`.
 */

/**
 * Subir esta versión invalida el caché entero en el próximo despliegue.
 * Hay que tocarla si cambia la estrategia o la lista de `PRECARGA`.
 */
const VERSION = "v1";
const CACHE = `nutricionista-${VERSION}`;

/**
 * Lo mínimo para que la pantalla sin conexión se vea: su HTML y el ícono.
 * `/sin-conexion` es una ruta pública y estática, no pasa por la sesión.
 */
const PRECARGA = ["/sin-conexion", "/iconos/icono-192.png"];

/** Rutas cuyo contenido es inmutable (llevan hash) o compartido por todos. */
function esAssetCacheable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/iconos/")
  );
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      // `addAll` es todo o nada: si una sola falla, no se instala nada. Se
      // cachea de a una para que un 404 pasajero no deje la app sin worker.
      .then((cache) =>
        Promise.all(PRECARGA.map((ruta) => cache.add(ruta).catch(() => {}))),
      ),
  );
  // Sin esto el worker nuevo espera a que se cierren TODAS las pestañas viejas,
  // y en una app que se deja abierta todo el día eso puede ser nunca.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre.startsWith("nutricionista-"))
            .filter((nombre) => nombre !== CACHE)
            .map((nombre) => caches.delete(nombre)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;

  // Solo lecturas del propio origen. Los POST/PUT (tRPC, login, subida de
  // archivos) no se tocan ni siquiera para pasarlos de largo.
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // `/api/*` incluye tRPC, Auth.js, el SSE de tiempo real y la descarga de
  // archivos del bucket: todo es por sesión y nada de eso se cachea.
  if (url.pathname.startsWith("/api/")) return;

  if (esAssetCacheable(url)) {
    evento.respondWith(desdeCacheOAlRed(pedido));
    return;
  }

  // Navegaciones: red siempre. Si no hay red, la pantalla sin conexión.
  // No se guarda la respuesta —ver el aviso de arriba—, así que esto no es
  // "network first con caché", es "red o cartel".
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(() =>
        caches
          .match("/sin-conexion")
          .then(
            (respuesta) =>
              respuesta ??
              new Response("Sin conexión", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          ),
      ),
    );
  }

  // Todo lo demás sigue su curso normal, sin intervención del worker.
});

/**
 * Caché primero, y si no está, red (guardando el resultado).
 * Vale únicamente para recursos con hash en el nombre: cuando el contenido
 * cambia, cambia la URL, así que una entrada vieja nunca queda obsoleta.
 */
async function desdeCacheOAlRed(pedido) {
  const cacheado = await caches.match(pedido);
  if (cacheado) return cacheado;

  const respuesta = await fetch(pedido);
  if (respuesta.ok && respuesta.type === "basic") {
    const cache = await caches.open(CACHE);
    cache.put(pedido, respuesta.clone());
  }
  return respuesta;
}

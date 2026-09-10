"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (`public/sw.js`) una vez cargada la página.
 *
 * No pinta nada; se monta en el layout raíz.
 *
 * **Solo en producción.** En desarrollo el worker cachearía los chunks de
 * `/_next/static/`, que ahí NO llevan hash de contenido: la URL no cambia
 * aunque el código sí, así que el navegador seguiría sirviendo la versión vieja
 * y el refresco en caliente dejaría de verse. Para probar la instalación en
 * local hay que correr `npm run build && npm start` (ver `docs/PWA.md`).
 */
export function RegistroServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    /**
     * Después del `load` y no en el efecto a secas: registrar el worker dispara
     * la precarga, y hacerlo mientras la página todavía está trayendo sus
     * propios recursos le compite el ancho de banda al primer render.
     */
    const registrar = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };

    if (document.readyState === "complete") {
      registrar();
      return;
    }
    window.addEventListener("load", registrar);
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}

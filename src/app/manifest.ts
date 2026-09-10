import type { MetadataRoute } from "next";

/**
 * Manifiesto de la PWA (se sirve en `/manifest.webmanifest`).
 *
 * Es la mitad de lo que hace instalable a la app; la otra mitad es el service
 * worker (`public/sw.js`). Sin las dos cosas, Chrome no ofrece "Instalar" y el
 * acceso directo queda siendo un simple marcador del navegador.
 *
 * Va como archivo de metadatos de Next y no como un .json en `public/` para que
 * el `<link rel="manifest">` lo inyecte el framework: si se escribe a mano en el
 * layout, se olvida cuando cambia la ruta. Ver `docs/PWA.md`.
 */
export default function manifiesto(): MetadataRoute.Manifest {
  return {
    name: "Nutricionista App — Lic. Nicolás López Asis",
    short_name: "Nutrición",
    description: "Gestión de pacientes, turnos y planes nutricionales",
    lang: "es",
    dir: "ltr",
    /**
     * `/` y no `/dashboard`: la raíz redirige según corresponda y el middleware
     * manda a `/login` si no hay sesión. Apuntar al dashboard rompería el acceso
     * directo del PACIENTE, que no tiene permiso sobre esa ruta.
     */
    start_url: "/",
    scope: "/",
    /**
     * `standalone`: se abre en su propia ventana, sin barra de direcciones. Es
     * lo que hace que se vea como una app nativa en el teléfono y en la PC.
     */
    display: "standalone",
    /**
     * Sin `orientation`: la app se usa en teléfono y en escritorio, y fijar
     * `portrait` dejaría la ventana de Windows atada a una forma vertical.
     */
    background_color: "#F1F1F3",
    theme_color: "#F4535E",
    categories: ["health", "medical", "productivity"],
    icons: [
      {
        src: "/iconos/icono-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icono-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      /**
       * Los `maskable` van aparte y a sangre: Android recorta el ícono con la
       * forma del launcher (círculo, gota, squircle) y solo respeta el 80%
       * central. Si se declara el mismo PNG para los dos propósitos, el sistema
       * recorta las esquinas redondeadas y queda un halo blanco alrededor.
       */
      {
        src: "/iconos/icono-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/iconos/icono-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

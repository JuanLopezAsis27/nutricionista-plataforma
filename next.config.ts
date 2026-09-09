import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

/**
 * Política de seguridad de contenido.
 *
 * Vive acá y no en nginx a propósito: el nginx de `docs/nginx.conf.ejemplo` es
 * OPCIONAL, así que un despliegue que no lo use —Docker a secas, staging, el
 * WebView de Android— se quedaba sin ninguna cabecera. Puesta en la app, viaja
 * con ella a donde vaya.
 *
 * Las dos concesiones a `unsafe-inline` no son pereza:
 *   - `script-src`: Next inyecta el script de arranque de la hidratación en
 *     línea. Quitarlo exige emitir un nonce por request desde el proxy y
 *     propagarlo al documento; es un cambio de arquitectura, no de config.
 *   - `style-src`: Tailwind y Radix escriben estilos en línea (animaciones,
 *     posicionamiento de popovers). Sin esto la interfaz se desarma.
 * Aun así, la política corta lo que de verdad importa: `object-src 'none'`,
 * `base-uri 'self'` y `form-action 'self'` cierran las vías clásicas de
 * exfiltración, y `default-src 'self'` impide que un XSS cargue nada de afuera.
 */
function politicaCsp(): string {
  const directivas = [
    "default-src 'self'",
    // 'unsafe-eval' solo en desarrollo: lo necesita el refresco en caliente.
    `script-src 'self' 'unsafe-inline'${esProduccion ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: y data: son para las vistas previas locales del subidor de archivos
    // (SubidorArchivo.tsx) antes de que el archivo llegue al servidor.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Mismo origen alcanza: tRPC y el stream SSE de tiempo real salen de acá.
    "connect-src 'self'",
    // El visor de PDF (VisorPdf.tsx) embebe /api/archivos/<id>/ver, que es
    // del mismo origen justamente para no depender de otro dominio.
    "frame-src 'self'",
    // 'self' y no 'none': la respuesta del archivo TIENE que poder ser embebida
    // por la propia app, o el visor de PDF queda en blanco.
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
  ];
  return directivas.join("; ");
}

/**
 * Configuración de Next.js 16 (App Router).
 * Se mantiene mínima: la lógica vive en las capas internas, no en la presentación.
 */
/**
 * Orígenes desde los que el servidor de DESARROLLO acepta pedidos.
 *
 * `next dev` solo atiende a localhost: desde un túnel (ngrok, Cloudflare) o
 * desde otra máquina de la red, los recursos internos de Next quedan
 * bloqueados. Se configura por entorno y no en el código porque el host del
 * túnel cambia en cada sesión.
 *
 *   DEV_ORIGINS_PERMITIDOS="*.ngrok-free.app,192.168.1.50"
 *
 * NO aplica en producción: ahí el que decide qué hosts se atienden es el
 * reverse proxy, y esta lista sería una puerta de más.
 */
function origenesDeDesarrollo(): string[] | undefined {
  if (esProduccion) return undefined;
  const crudo = process.env.DEV_ORIGINS_PERMITIDOS?.trim();
  if (!crudo) return undefined;
  const origenes = crudo
    .split(",")
    .map((origen) => origen.trim())
    .filter(Boolean);
  return origenes.length > 0 ? origenes : undefined;
}

const config: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: origenesDeDesarrollo(),
  // Genera un servidor autónomo mínimo (.next/standalone) para empaquetar la
  // app en una imagen Docker liviana. Ver Dockerfile (stage runner).
  output: "standalone",
  // No anunciar el framework: le ahorra al atacante el trabajo de averiguar
  // contra qué está y qué exploits probar.
  poweredByHeader: false,
  // Las variables de entorno sensibles nunca se exponen al cliente.
  // Solo las que empiezan con NEXT_PUBLIC_ llegan al navegador.

  /**
   * Cabeceras de seguridad para TODAS las rutas (páginas y `/api/*`).
   *
   * `Referrer-Policy` es la que no se puede omitir en esta app: el enlace de
   * recuperación es `/restablecer?token=…`, y con la política por defecto ese
   * token viaja en el `Referer` hacia cualquier recurso externo que cargue la
   * página. Con `strict-origin-when-cross-origin` sale el origen, nunca la
   * query.
   */
  async headers() {
    return [
      {
        source: "/:ruta*",
        headers: [
          { key: "Content-Security-Policy", value: politicaCsp() },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SAMEORIGIN y no DENY: ver el comentario de `frame-ancestors`.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            /**
             * Permissions-Policy: todo apagado salvo el micrófono.
             *
             * `microphone=(self)` habilita la grabación de consultas
             * (`useGrabadorAudio`). Mientras estuvo en `microphone=()`, el
             * navegador rechazaba `getUserMedia` con `NotAllowedError` AUNQUE
             * el usuario ya hubiera concedido el permiso, y sin ninguna pista
             * en la interfaz: la política de la página gana sobre el permiso
             * de la persona, así que "dar permiso" no cambiaba nada.
             *
             * `(self)` y no `*`: lo habilita para este origen y NO para lo que
             * se embeba dentro. La cámara sigue apagada —no se graba video— y
             * también el resto.
             */
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
          },
          // HSTS solo en producción: en desarrollo se sirve por http y esta
          // cabecera dejaría el dominio local clavado en https en el navegador.
          ...(esProduccion
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },

  // Fase 3: el módulo Dietas evolucionó a Planes Nutricionales.
  // Los enlaces/favoritos viejos siguen funcionando.
  async redirects() {
    return [
      {
        source: "/dashboard/dietas",
        destination: "/dashboard/planes",
        permanent: true,
      },
      {
        source: "/dashboard/dietas/:id",
        destination: "/dashboard/planes",
        permanent: true,
      },
      { source: "/mi-dieta", destination: "/mi-plan", permanent: true },
      // Secretaría se fusionó con Recordatorios: era media tarea en otra
      // pantalla, con su propio botón de envío y su propio texto.
      {
        source: "/dashboard/plantillas",
        destination: "/dashboard/recordatorios",
        permanent: true,
      },
    ];
  },
};

export default config;

import type { Instrumentation } from "next";

/**
 * Se ejecuta una vez al arrancar el servidor. En el runtime Node engancha los
 * errores de proceso no capturados (promesas rechazadas y excepciones sueltas)
 * al monitor.
 *
 * El enganche vive en `./instrumentacionNodo` y entra por `import()` dinámico:
 * este archivo lo compila el bundler para los DOS runtimes, y `process.on` no
 * existe en Edge. El `return` temprano lo hacía inalcanzable en ejecución, pero
 * el análisis del bundler es estático —veía la llamada igual— y cada build
 * terminaba con dos warnings de "Node.js API used in the Edge Runtime".
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { engancharErroresDeProceso } = await import("./instrumentacionNodo");
  engancharErroresDeProceso();
}

/**
 * Instrumentación de Next.js.
 *
 * `onRequestError` es el hook oficial que Next invoca ante CUALQUIER error no
 * capturado del servidor (RSC, route handlers, SSR). Lo enrutamos al monitor de
 * errores (consola estructurada + webhook opcional). Es el mismo punto donde se
 * enchufaría Sentry.
 *
 * Se importa el monitor de forma perezosa (dentro del handler) para no cargar
 * infraestructura en el arranque ni en el runtime Edge.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Edge runtime no tiene acceso a todo; solo reportamos desde Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { monitorErrores } =
    await import("@/infraestructura/monitoreo/monitor");
  monitorErrores.capturar(error, {
    origen: "servidor",
    ruta: request.path,
    extra: {
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      renderSource: context.renderSource,
    },
  });
};

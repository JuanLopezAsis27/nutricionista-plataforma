import { monitorErrores } from "@/infraestructura/monitoreo/monitor";

/**
 * Enganches de proceso que SOLO existen en Node: promesas rechazadas sin
 * catch y excepciones que escaparon de todo.
 *
 * Vive en su propio módulo y no en `instrumentation.ts` porque ese archivo lo
 * analiza el bundler para los DOS runtimes, Node y Edge. `process.on` no
 * existe en Edge, y aunque el `return` temprano por `NEXT_RUNTIME` lo hacía
 * inalcanzable en tiempo de ejecución, el análisis es estático: veía la
 * llamada y avisaba en cada build. Detrás de un `import()` dinámico, el módulo
 * ni se mira cuando se compila el bundle de Edge.
 *
 * No se llama `process.exit`: se deja que Next gestione el ciclo de vida.
 */
export function engancharErroresDeProceso(): void {
  process.on("unhandledRejection", (razon) => {
    monitorErrores.capturar(razon, { origen: "unhandledRejection" });
  });
  process.on("uncaughtException", (error) => {
    monitorErrores.capturar(error, { origen: "uncaughtException" });
  });
}

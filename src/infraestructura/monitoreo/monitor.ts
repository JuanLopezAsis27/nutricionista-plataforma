import { crearMonitorErrores } from "./configMonitoreo";

/**
 * Instancia compartida del monitor de errores.
 *
 * Vive en su propio módulo (no en el contenedor) para poder usarse desde
 * `instrumentation.ts`, route handlers y el middleware de tRPC sin arrastrar
 * Prisma ni el resto del contenedor a esos contextos.
 */
export const monitorErrores = crearMonitorErrores();

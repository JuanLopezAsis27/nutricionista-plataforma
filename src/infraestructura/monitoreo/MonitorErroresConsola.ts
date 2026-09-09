import type {
  IMonitorErrores,
  ContextoError,
} from "@/dominio/servicios/IMonitorErrores";

/** Normaliza cualquier valor lanzado a { mensaje, stack, nombre }. */
export function describirError(error: unknown): {
  nombre: string;
  mensaje: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return { nombre: error.name, mensaje: error.message, stack: error.stack };
  }
  return {
    nombre: "NoError",
    mensaje: typeof error === "string" ? error : JSON.stringify(error),
  };
}

/**
 * Monitor por consola: emite una línea JSON estructurada a stderr.
 *
 * Funciona en cualquier entorno sin dependencias ni cuentas externas. En el VPS
 * las líneas quedan en `docker logs` / journald / archivo, listas para que un
 * agregador (o el propio operador) las lea. Es el destino por defecto.
 */
export class MonitorErroresConsola implements IMonitorErrores {
  capturar(error: unknown, contexto?: ContextoError): void {
    const { nombre, mensaje, stack } = describirError(error);
    const registro = {
      nivel: "error",
      ts: new Date().toISOString(),
      nombre,
      mensaje,
      origen: contexto?.origen,
      ruta: contexto?.ruta,
      usuarioId: contexto?.usuarioId,
      extra: contexto?.extra,
      stack,
    };
    // Una sola línea JSON: fácil de parsear por un agregador de logs.
    try {
      console.error(JSON.stringify(registro));
    } catch {
      // Nunca dejar que el monitoreo rompa el flujo que lo invoca.
      console.error(`[monitor] ${nombre}: ${mensaje}`);
    }
  }
}

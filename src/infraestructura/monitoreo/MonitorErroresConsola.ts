import type {
  IMonitorErrores,
  ContextoError,
} from "@/dominio/servicios/IMonitorErrores";

/** Cuántas líneas del stack se conservan (ver `truncarStack`). */
const MAX_LINEAS_STACK = 8;
/** Cuántos caracteres del mensaje se conservan (ver `truncarMensaje`). */
const MAX_LARGO_MENSAJE = 500;

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
 * Recorta un mensaje larguísimo (ej. una consulta SQL completa en el error de
 * Prisma, o el HTML de una respuesta de error de un servicio externo). Sin
 * esto, una sola línea del log puede tener miles de caracteres y tapar el
 * resto.
 */
export function truncarMensaje(mensaje: string): string {
  if (mensaje.length <= MAX_LARGO_MENSAJE) return mensaje;
  return `${mensaje.slice(0, MAX_LARGO_MENSAJE)}… (${mensaje.length} caracteres, truncado)`;
}

/**
 * Se queda con las primeras líneas del stack: el resto casi siempre es
 * código de framework (Next.js, tRPC, Node) que no ayuda a encontrar el bug,
 * y con un stack de async/await de por medio puede irse a varias decenas de
 * líneas.
 */
export function truncarStack(stack: string | undefined): string | undefined {
  if (!stack) return stack;
  const lineas = stack.split("\n");
  if (lineas.length <= MAX_LINEAS_STACK) return stack;
  return [
    ...lineas.slice(0, MAX_LINEAS_STACK),
    `    … (${lineas.length - MAX_LINEAS_STACK} líneas más, omitidas)`,
  ].join("\n");
}

/**
 * Monitor por consola: emite el error a stderr.
 *
 * Funciona en cualquier entorno sin dependencias ni cuentas externas. En el VPS
 * las líneas quedan en `docker logs` / journald / archivo, listas para que un
 * agregador (o el propio operador) las lea. Es el destino por defecto.
 *
 * Van en DOS líneas a propósito, no una: una cabecera JSON compacta —lo que
 * importa para encontrar el error (qué, dónde, quién) y lo que parsea un
 * agregador— y el stack (recortado) debajo, en texto plano con saltos de
 * línea reales. Todo en una sola línea JSON obligaba a leer un stack entero
 * con los saltos escapados como `\n` literales, ilegible a simple vista en
 * `docker logs`.
 */
export class MonitorErroresConsola implements IMonitorErrores {
  capturar(error: unknown, contexto?: ContextoError): void {
    const { nombre, mensaje, stack } = describirError(error);
    const cabecera = {
      nivel: "error",
      ts: new Date().toISOString(),
      nombre,
      mensaje: truncarMensaje(mensaje),
      origen: contexto?.origen,
      ruta: contexto?.ruta,
      usuarioId: contexto?.usuarioId,
      extra: contexto?.extra,
    };
    try {
      console.error(JSON.stringify(cabecera));
      if (stack) console.error(truncarStack(stack));
    } catch {
      // Nunca dejar que el monitoreo rompa el flujo que lo invoca.
      console.error(`[monitor] ${nombre}: ${mensaje}`);
    }
  }
}

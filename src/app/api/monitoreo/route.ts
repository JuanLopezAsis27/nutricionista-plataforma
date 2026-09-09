import { monitorErrores } from "@/infraestructura/monitoreo/monitor";
import { limitadorMonitoreo } from "@/infraestructura/seguridad/LimitadorTasa";

/**
 * Ingesta de errores del cliente (React error boundary, ver global-error.tsx).
 *
 * Endpoint liviano y público (los errores de UI pueden ocurrir sin sesión). Se
 * limita el tamaño del cuerpo y se recorta el texto para evitar abuso; nunca
 * devuelve contenido. El runtime es Node para poder usar el monitor.
 */
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024;

/**
 * IP de origen. `X-Real-IP` primero: lo escribe nuestro nginx con
 * `$remote_addr` y pisa lo que venga de afuera. De `X-Forwarded-For` se toma el
 * ÚLTIMO elemento, que es el que agregó el proxy; el primero lo elige el
 * cliente y usarlo dejaría el límite sin efecto.
 */
function ipDeSolicitud(peticion: Request): string {
  const real = peticion.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const reenviada = peticion.headers.get("x-forwarded-for");
  if (reenviada) {
    const partes = reenviada
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1]!;
  }
  return "desconocida";
}

export async function POST(peticion: Request): Promise<Response> {
  // Límite de tasa por IP. El endpoint es público y sin sesión a propósito (un
  // error de interfaz puede pasarle a alguien que no llegó a entrar), y el
  // tope de 8 KB acota el tamaño de cada aviso pero no cuántos llegan. Sin
  // esto, cualquiera puede inundar el webhook de avisos del profesional hasta
  // que los errores de verdad queden enterrados entre el ruido.
  const { permitido } = limitadorMonitoreo.intentar(ipDeSolicitud(peticion));
  if (!permitido) {
    return new Response(null, { status: 429 });
  }

  try {
    const texto = await peticion.text();
    if (texto.length > MAX_BYTES) {
      return new Response(null, { status: 413 });
    }
    const datos = JSON.parse(texto) as {
      mensaje?: string;
      stack?: string;
      ruta?: string;
      digest?: string;
    };
    const error = new Error(recortar(datos.mensaje, 500) || "Error de cliente");
    if (datos.stack) error.stack = recortar(datos.stack, 4000);

    monitorErrores.capturar(error, {
      origen: "cliente",
      ruta: recortar(datos.ruta, 300),
      extra: datos.digest ? { digest: datos.digest } : undefined,
    });
  } catch {
    // Cuerpo inválido: se ignora en silencio (no es crítico).
  }
  return new Response(null, { status: 204 });
}

function recortar(valor: string | undefined, max: number): string | undefined {
  if (!valor) return undefined;
  return valor.length > max ? valor.slice(0, max) : valor;
}

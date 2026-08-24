import { monitorErrores } from "@/infraestructura/monitoreo/monitor";

/**
 * Ingesta de errores del cliente (React error boundary, ver global-error.tsx).
 *
 * Endpoint liviano y público (los errores de UI pueden ocurrir sin sesión). Se
 * limita el tamaño del cuerpo y se recorta el texto para evitar abuso; nunca
 * devuelve contenido. El runtime es Node para poder usar el monitor.
 */
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024;

export async function POST(peticion: Request): Promise<Response> {
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

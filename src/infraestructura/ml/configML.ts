/** Configuración del microservicio de ML (de variables de entorno). */
export interface ConfigML {
  url: string;
  /** Token opcional (Bearer) para autenticar contra el servicio de ML. */
  token: string | null;
}

/**
 * Lee la config del servicio de ML. Devuelve null si NO está configurado (sin
 * `ML_SERVICE_URL`): en ese caso los adaptadores de IA usan los stubs de
 * demostración y la app funciona igual que hoy.
 */
export function obtenerConfigML(): ConfigML | null {
  const url = process.env.ML_SERVICE_URL;
  if (!url) return null;
  return {
    url: url.replace(/\/$/, ""),
    token: process.env.ML_SERVICE_TOKEN ?? null,
  };
}

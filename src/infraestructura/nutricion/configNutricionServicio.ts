/**
 * Configuración del servicio externo de nutrición (microservicio Go / Lambda que
 * hace de intermediario con FatSecret: traduce y filtra). Es OPCIONAL: si no se
 * define `NUTRICION_SERVICE_URL`, el contenedor no envuelve nada y la app usa el
 * proveedor local (FatSecret directo / Open Food Facts) como siempre.
 */
export interface ConfigNutricionServicio {
  /** URL del endpoint POST del servicio (Function URL de Lambda o HTTP local). */
  url: string;
  /** Token compartido (Authorization: Bearer). Null si el servicio no lo exige. */
  token: string | null;
  /** Timeout de la llamada, en milisegundos. */
  timeoutMs: number;
}

export function obtenerConfigNutricionServicio(): ConfigNutricionServicio | null {
  const url = process.env.NUTRICION_SERVICE_URL?.trim();
  if (!url) return null;

  const token = process.env.NUTRICION_SERVICE_TOKEN?.trim();
  return {
    url,
    token: token ? token : null,
    timeoutMs: 8000,
  };
}

/** Configuración del proveedor de datos nutricionales (Open Food Facts). */
export interface ConfigNutricion {
  /** Base del API de Open Food Facts (subdominio de idioma). */
  baseUrl: string;
}

/**
 * Lee la config del proveedor de datos nutricionales. Open Food Facts es
 * gratuito y sin API key, así que por defecto está HABILITADO (subdominio en
 * español). Si se define `NUTRICION_DESHABILITADA=true`, devuelve null y el
 * contenedor usa el proveedor nulo (la receta se carga a mano).
 */
export function obtenerConfigNutricion(): ConfigNutricion | null {
  if (process.env.NUTRICION_DESHABILITADA === "true") return null;
  const baseUrl = process.env.OFF_BASE_URL ?? "https://es.openfoodfacts.org";
  return { baseUrl: baseUrl.replace(/\/$/, "") };
}

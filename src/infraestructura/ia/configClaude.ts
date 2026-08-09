/** Configuración del adaptador de IA con Claude (API de Anthropic). */
export interface ConfigClaude {
  apiKey: string;
  /** Modelo a usar. Por defecto Claude Opus 5; configurable por entorno. */
  modelo: string;
}

/**
 * Lee la config de Claude. Devuelve null si NO está configurada (sin
 * `ANTHROPIC_API_KEY`): en ese caso el asistente y el análisis de comida usan
 * los stubs de demostración y la app funciona igual que hoy.
 *
 * El modelo se puede cambiar con `ANTHROPIC_MODEL` (p. ej. `claude-sonnet-5`
 * o `claude-haiku-4-5` para bajar costo/latencia).
 */
export function obtenerConfigClaude(): ConfigClaude | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return { apiKey, modelo: process.env.ANTHROPIC_MODEL ?? "claude-opus-5" };
}

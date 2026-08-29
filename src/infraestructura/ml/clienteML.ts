import type { ConfigML } from "./configML";

/**
 * Cliente HTTP mínimo del servicio de ML (fetch + timeout + auth Bearer).
 * Lo comparten los adaptadores de análisis predictivo y de comida.
 */
export class ClienteML {
  constructor(private readonly config: ConfigML) {}

  async postar<T>(ruta: string, cuerpo: unknown, timeoutMs = 8000): Promise<T> {
    const control = new AbortController();
    const t = setTimeout(() => control.abort(), timeoutMs);
    try {
      const respuesta = await fetch(`${this.config.url}${ruta}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.token
            ? { Authorization: `Bearer ${this.config.token}` }
            : {}),
        },
        body: JSON.stringify(cuerpo),
        signal: control.signal,
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => "");
        throw new Error(
          `ML ${ruta} (${respuesta.status}): ${detalle.slice(0, 200)}`,
        );
      }
      return (await respuesta.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }
}

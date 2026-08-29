import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";

/**
 * Traductor de nombres de ingredientes entre español e inglés. Permite que el
 * nutri busque en español en una base en inglés (FatSecret) y vea los
 * resultados en español. Usa el proveedor de IA del profesional (Claude u
 * OpenRouter); si no hay, deja los textos como están (sin traducir).
 */
export interface ITraductorIngredientes {
  aIngles(termino: string): Promise<string>;
  aEspanol(nombres: string[]): Promise<string[]>;
}

const ESQUEMA_TRAD = {
  type: "object",
  additionalProperties: false,
  properties: { traducciones: { type: "array", items: { type: "string" } } },
  required: ["traducciones"],
};

export class TraductorIngredientesIA implements ITraductorIngredientes {
  private readonly cacheEn = new Map<string, string>();
  private readonly cacheEs = new Map<string, string>();

  constructor(private readonly resolver: IResolvedorConfigIA) {}

  async aIngles(termino: string): Promise<string> {
    const clave = termino.trim().toLowerCase();
    if (!clave) return termino;
    const enCache = this.cacheEn.get(clave);
    if (enCache) return enCache;

    const llm = await this.resolver.obtenerLLM();
    if (!llm) return termino;

    try {
      const respuesta = await llm.completar({
        system:
          "Traducís nombres de alimentos/ingredientes del español al inglés para buscarlos en " +
          "una base nutricional. Respondé SOLO con el término en inglés, sin comillas ni texto extra.",
        usuario: [{ tipo: "texto", texto: termino.trim() }],
        maxTokens: 80,
      });
      const en = respuesta.split("\n")[0]?.trim();
      const resultado = en && en.length > 0 ? en : termino;
      this.cacheEn.set(clave, resultado);
      return resultado;
    } catch {
      return termino;
    }
  }

  async aEspanol(nombres: string[]): Promise<string[]> {
    if (nombres.length === 0) return nombres;
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return nombres;

    const faltan = [
      ...new Set(
        nombres
          .map((n) => n.trim())
          .filter((n) => n && !this.cacheEs.has(n.toLowerCase())),
      ),
    ];

    if (faltan.length > 0) {
      try {
        const respuesta = await llm.completar({
          system:
            "Traducís nombres de alimentos/ingredientes del inglés al español rioplatense. " +
            "Devolvés SOLO el JSON pedido: `traducciones`, un array con la MISMA cantidad de " +
            "elementos y en el MISMO orden que la entrada.",
          usuario: [{ tipo: "texto", texto: JSON.stringify(faltan) }],
          maxTokens: 1024,
          esquemaJson: { nombre: "traducciones", esquema: ESQUEMA_TRAD },
        });
        const datos = JSON.parse(respuesta) as { traducciones?: string[] };
        const trad = datos.traducciones ?? [];
        faltan.forEach((n, i) => {
          const t = trad[i];
          if (typeof t === "string" && t.trim())
            this.cacheEs.set(n.toLowerCase(), t.trim());
        });
      } catch {
        // Dejamos los nombres en inglés si algo falla.
      }
    }

    return nombres.map((n) => this.cacheEs.get(n.trim().toLowerCase()) ?? n);
  }
}

import Anthropic from "@anthropic-ai/sdk";
import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { IProveedorLLM } from "./IProveedorLLM";
import { ProveedorLLMAnthropic } from "./ProveedorLLMAnthropic";
import { ProveedorLLMOpenRouter } from "./ProveedorLLMOpenRouter";
import { obtenerConfigClaude } from "./configClaude";

const MODELO_ANTHROPIC = "claude-opus-5";
const MODELO_OPENROUTER = "anthropic/claude-opus-5";

export interface IResolvedorConfigIA {
  /** Proveedor LLM del inquilino actual, o null si no hay clave en ningún lado. */
  obtenerLLM(): Promise<IProveedorLLM | null>;
}

interface ClaveResuelta {
  proveedor: "ANTHROPIC" | "OPENROUTER";
  apiKey: string;
  modelo: string;
}

/**
 * Resuelve el proveedor de IA POR REQUEST, priorizando lo que el profesional
 * cargó en la app (proveedor + clave + modelo) y cayendo a la variable de
 * entorno `ANTHROPIC_API_KEY`. Si no hay clave, devuelve null y los adaptadores
 * usan los stubs. Los proveedores se cachean por (proveedor, clave, modelo).
 */
export class ResolvedorConfigIA implements IResolvedorConfigIA {
  private readonly cache = new Map<string, IProveedorLLM>();

  constructor(private readonly credenciales: ICredencialesIntegracionRepositorio) {}

  /** Solo indica si hay IA configurada (sin construir el proveedor). */
  async tieneIA(): Promise<boolean> {
    return (await this.resolver()) !== null;
  }

  async obtenerLLM(): Promise<IProveedorLLM | null> {
    const r = await this.resolver();
    if (!r) return null;

    const clave = `${r.proveedor}:${r.apiKey}:${r.modelo}`;
    let proveedor = this.cache.get(clave);
    if (!proveedor) {
      proveedor =
        r.proveedor === "OPENROUTER"
          ? new ProveedorLLMOpenRouter(r.apiKey, r.modelo)
          : new ProveedorLLMAnthropic(new Anthropic({ apiKey: r.apiKey }), r.modelo);
      this.cache.set(clave, proveedor);
    }
    return proveedor;
  }

  private async resolver(): Promise<ClaveResuelta | null> {
    try {
      const c = await this.credenciales.obtener();
      if (c?.anthropicApiKey) {
        const proveedor = c.proveedorIA === "OPENROUTER" ? "OPENROUTER" : "ANTHROPIC";
        const modelo =
          c.anthropicModelo ??
          (proveedor === "OPENROUTER" ? MODELO_OPENROUTER : MODELO_ANTHROPIC);
        return { proveedor, apiKey: c.anthropicApiKey, modelo };
      }
    } catch {
      // Sin alcance de inquilino o error de lectura → probamos el entorno.
    }
    const env = obtenerConfigClaude();
    return env ? { proveedor: "ANTHROPIC", apiKey: env.apiKey, modelo: env.modelo } : null;
  }
}

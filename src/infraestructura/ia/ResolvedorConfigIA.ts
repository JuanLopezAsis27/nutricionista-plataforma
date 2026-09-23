import Anthropic from "@anthropic-ai/sdk";
import type { IConfiguracionIAGlobalRepositorio } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type { IRegistroUsoIARepositorio } from "@/dominio/repositorios/IRegistroUsoIARepositorio";
import type { IProveedorLLM } from "./IProveedorLLM";
import { ProveedorLLMAnthropic } from "./ProveedorLLMAnthropic";
import { ProveedorLLMOpenRouter } from "./ProveedorLLMOpenRouter";
import { ProveedorLLMRegistrado } from "./registroUso";
import { obtenerConfigClaude } from "./configClaude";

export const MODELO_ANTHROPIC = "claude-opus-5";
export const MODELO_OPENROUTER = "anthropic/claude-opus-5";

export interface IResolvedorConfigIA {
  /** Proveedor LLM de la plataforma, o null si no hay clave en ningún lado. */
  obtenerLLM(): Promise<IProveedorLLM | null>;
}

interface ClaveResuelta {
  proveedor: "ANTHROPIC" | "OPENROUTER";
  apiKey: string;
  modelo: string;
}

/**
 * Resuelve el proveedor de IA POR LLAMADA a partir de la configuración de la
 * PLATAFORMA (la carga el SUPERADMIN; desde la migración 71 ya no hay claves
 * por consultorio), cayendo a la variable de entorno `ANTHROPIC_API_KEY`. Si
 * no hay clave, devuelve null y los adaptadores usan los stubs.
 *
 * Lo que devuelve va envuelto en `ProveedorLLMRegistrado`: cada llamada queda
 * en el registro de uso con el consultorio que la hizo. Los proveedores se
 * cachean por (proveedor, clave, modelo).
 */
export class ResolvedorConfigIA implements IResolvedorConfigIA {
  private readonly cache = new Map<string, IProveedorLLM>();

  constructor(
    private readonly configuracion: IConfiguracionIAGlobalRepositorio,
    private readonly registro: IRegistroUsoIARepositorio,
  ) {}

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
      const interno =
        r.proveedor === "OPENROUTER"
          ? new ProveedorLLMOpenRouter(r.apiKey, r.modelo)
          : new ProveedorLLMAnthropic(
              new Anthropic({ apiKey: r.apiKey }),
              r.modelo,
            );
      proveedor = new ProveedorLLMRegistrado(
        interno,
        r.proveedor,
        this.registro,
      );
      this.cache.set(clave, proveedor);
    }
    return proveedor;
  }

  private async resolver(): Promise<ClaveResuelta | null> {
    try {
      const c = await this.configuracion.obtener();
      const apiKey = c.claves[c.proveedorIA];
      if (apiKey) {
        const modelo =
          c.modeloIA ??
          (c.proveedorIA === "OPENROUTER"
            ? MODELO_OPENROUTER
            : MODELO_ANTHROPIC);
        return { proveedor: c.proveedorIA, apiKey, modelo };
      }
    } catch (error) {
      console.error("[ia] no se pudo leer la configuración de IA:", error);
    }
    const env = obtenerConfigClaude();
    return env
      ? { proveedor: "ANTHROPIC", apiKey: env.apiKey, modelo: env.modelo }
      : null;
  }
}

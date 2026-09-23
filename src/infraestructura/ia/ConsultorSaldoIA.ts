import type { ProveedorClaveIA } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type {
  IConsultorSaldoIA,
  SaldoIA,
} from "@/dominio/servicios/IConsultorSaldoIA";

const TIEMPO_LIMITE_MS = 10_000;

/** Dónde mirar el saldo cuando el proveedor no lo expone por API. */
const CONSOLA: Record<ProveedorClaveIA, string> = {
  ANTHROPIC: "console.anthropic.com → Billing",
  OPENROUTER: "openrouter.ai/settings/credits",
  OPENAI: "platform.openai.com/settings/organization/billing",
};

interface RespuestaCreditos {
  data?: { total_credits?: number; total_usage?: number };
}
interface RespuestaClave {
  data?: {
    usage?: number;
    limit?: number | null;
    limit_remaining?: number | null;
  };
}

/**
 * Pregunta a cada proveedor por una clave: si anda y, donde se puede, cuánto
 * crédito le queda.
 *
 *  - **OpenRouter** informa crédito comprado y consumido (`/credits`) con la
 *    misma clave que se usa para llamar, y además el tope propio de la clave
 *    (`/key`), si se le puso uno.
 *  - **Anthropic** y **OpenAI** no tienen endpoint de saldo para una clave
 *    común. Se prueba la clave listando los modelos —no gasta nada— y el saldo
 *    se deja en null con la dirección de la consola donde verlo.
 *
 * Nunca lanza: un proveedor caído es un dato del panel, no un error de la
 * pantalla entera.
 */
export class ConsultorSaldoIA implements IConsultorSaldoIA {
  async consultar(
    proveedor: ProveedorClaveIA,
    apiKey: string | null,
  ): Promise<SaldoIA> {
    const base: SaldoIA = {
      proveedor,
      claveValida: null,
      saldoUsd: null,
      usadoUsd: null,
      limiteUsd: null,
      nota: null,
    };
    if (!apiKey) return { ...base, nota: "Sin clave cargada." };

    try {
      if (proveedor === "OPENROUTER")
        return await this.openRouter(apiKey, base);
      const valida = await this.probarClave(proveedor, apiKey);
      return {
        ...base,
        claveValida: valida,
        nota: valida
          ? `El proveedor no informa el saldo por API: se ve en ${CONSOLA[proveedor]}.`
          : "El proveedor rechazó la clave.",
      };
    } catch (error) {
      return {
        ...base,
        nota: `No se pudo consultar al proveedor: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async openRouter(apiKey: string, base: SaldoIA): Promise<SaldoIA> {
    const cabeceras = { Authorization: `Bearer ${apiKey}` };
    const clave = await fetch("https://openrouter.ai/api/v1/key", {
      headers: cabeceras,
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (clave.status === 401 || clave.status === 403) {
      return {
        ...base,
        claveValida: false,
        nota: "OpenRouter rechazó la clave.",
      };
    }
    if (!clave.ok) throw new Error(`OpenRouter respondió ${clave.status}.`);
    const datosClave = ((await clave.json()) as RespuestaClave).data;

    // El crédito de la CUENTA. Si no se puede leer, queda el tope de la clave.
    const creditos = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: cabeceras,
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    }).catch(() => null);
    const datosCuenta = creditos?.ok
      ? ((await creditos.json()) as RespuestaCreditos).data
      : undefined;

    if (
      typeof datosCuenta?.total_credits === "number" &&
      typeof datosCuenta.total_usage === "number"
    ) {
      return {
        ...base,
        claveValida: true,
        saldoUsd: datosCuenta.total_credits - datosCuenta.total_usage,
        usadoUsd: datosCuenta.total_usage,
        limiteUsd: datosCuenta.total_credits,
        nota:
          datosClave?.limit_remaining != null
            ? `La clave tiene además un tope propio: le quedan US$ ${datosClave.limit_remaining.toFixed(2)}.`
            : null,
      };
    }
    return {
      ...base,
      claveValida: true,
      saldoUsd: datosClave?.limit_remaining ?? null,
      usadoUsd: datosClave?.usage ?? null,
      limiteUsd: datosClave?.limit ?? null,
      nota:
        datosClave?.limit_remaining == null
          ? `La clave no tiene tope y no se pudo leer el crédito de la cuenta: se ve en ${CONSOLA.OPENROUTER}.`
          : "Saldo del tope propio de la clave.",
    };
  }

  /** Lista los modelos: confirma la clave sin gastar un token. */
  private async probarClave(
    proveedor: "ANTHROPIC" | "OPENAI",
    apiKey: string,
  ): Promise<boolean> {
    const respuesta =
      proveedor === "ANTHROPIC"
        ? await fetch("https://api.anthropic.com/v1/models?limit=1", {
            headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
          })
        : await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
          });
    if (respuesta.status === 401 || respuesta.status === 403) return false;
    if (!respuesta.ok) throw new Error(`respondió ${respuesta.status}.`);
    return true;
  }
}

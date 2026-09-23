import type {
  IRegistroUsoIARepositorio,
  UsoIA,
} from "@/dominio/repositorios/IRegistroUsoIARepositorio";
import type {
  AlConsumirLLM,
  ConsumoLLM,
  IProveedorLLM,
  OpcionesConversacion,
  OpcionesLLM,
} from "./IProveedorLLM";
import type { ProveedorClaveIA } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";

/**
 * Anota una llamada en el registro de uso SIN poder romperla.
 *
 * El registro es contabilidad de la plataforma: si la base tarda o falla al
 * escribirlo, el profesional igual tiene que recibir su respuesta. Por eso el
 * error se loguea y se traga, al revés de la regla general de la IA de la app.
 */
export async function anotarUso(
  registro: IRegistroUsoIARepositorio,
  uso: UsoIA,
): Promise<void> {
  try {
    await registro.registrar(uso);
  } catch (error) {
    console.error("[uso-ia] no se pudo registrar la llamada:", error);
  }
}

/** Suma los consumos de las vueltas de UNA operación. */
export class AcumuladorConsumo {
  tokensEntrada = 0;
  tokensSalida = 0;
  costoUsd: number | null = null;

  sumar(consumo: ConsumoLLM): void {
    this.tokensEntrada += consumo.tokensEntrada;
    this.tokensSalida += consumo.tokensSalida;
    if (consumo.costoUsd !== null) {
      this.costoUsd = (this.costoUsd ?? 0) + consumo.costoUsd;
    }
  }
}

/**
 * Decorador del proveedor de LLM que deja una fila en el registro de uso por
 * cada `completar` o `conversar`, haya salido bien o mal.
 *
 * Es UNA fila por operación y no por vuelta de la API: una pregunta al
 * asistente que consultó tres herramientas es una sola cosa para quien mira el
 * gasto, y así la cuenta de errores no se infla por las vueltas intermedias.
 */
export class ProveedorLLMRegistrado implements IProveedorLLM {
  constructor(
    private readonly interno: IProveedorLLM,
    private readonly proveedor: ProveedorClaveIA,
    private readonly registro: IRegistroUsoIARepositorio,
  ) {}

  get modelo(): string {
    return this.interno.modelo;
  }

  completar(opts: OpcionesLLM): Promise<string> {
    return this.medir("completar", opts.alConsumir, (alConsumir) =>
      this.interno.completar({ ...opts, alConsumir }),
    );
  }

  conversar(opts: OpcionesConversacion): Promise<string> {
    return this.medir("conversar", opts.alConsumir, (alConsumir) =>
      this.interno.conversar({ ...opts, alConsumir }),
    );
  }

  private async medir(
    operacion: string,
    externo: AlConsumirLLM | undefined,
    llamar: (alConsumir: AlConsumirLLM) => Promise<string>,
  ): Promise<string> {
    const acumulado = new AcumuladorConsumo();
    const inicio = Date.now();
    let error: string | null = null;
    try {
      return await llamar((consumo) => {
        acumulado.sumar(consumo);
        externo?.(consumo);
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await anotarUso(this.registro, {
        capacidad: "LLM",
        proveedor: this.proveedor,
        modelo: this.interno.modelo,
        operacion,
        tokensEntrada: acumulado.tokensEntrada,
        tokensSalida: acumulado.tokensSalida,
        costoUsd: acumulado.costoUsd,
        exito: error === null,
        error,
        duracionMs: Date.now() - inicio,
      });
    }
  }
}

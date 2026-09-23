import type { ProveedorClaveIA } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";

/**
 * Lo que un proveedor dice de una clave: si anda y cuánto crédito le queda.
 *
 * Cada proveedor expone una cosa distinta. OpenRouter informa crédito y
 * consumo con la misma clave que se usa para llamar; Anthropic y OpenAI no
 * tienen un endpoint de saldo para una clave común (el de costos pide una
 * clave de administración de la organización). Por eso `saldoUsd` puede ser
 * null con la clave perfectamente válida, y `nota` dice dónde mirarlo.
 */
export interface SaldoIA {
  proveedor: ProveedorClaveIA;
  /** null = no hay clave cargada, así que no se pudo probar. */
  claveValida: boolean | null;
  saldoUsd: number | null;
  usadoUsd: number | null;
  limiteUsd: number | null;
  nota: string | null;
}

/** Puerto: consulta al proveedor el estado de una clave. Nunca lanza. */
export interface IConsultorSaldoIA {
  consultar(
    proveedor: ProveedorClaveIA,
    apiKey: string | null,
  ): Promise<SaldoIA>;
}

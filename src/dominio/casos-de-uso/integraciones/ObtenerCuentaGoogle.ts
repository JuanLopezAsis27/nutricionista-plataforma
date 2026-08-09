import type { ICuentaConectadaRepositorio } from "../../repositorios/ICuentaConectadaRepositorio";
import type { CuentaConectada } from "../../entidades/CuentaConectada";

/** Caso de uso: obtener la cuenta de Google conectada del nutricionista (o null). */
export class ObtenerCuentaGoogle {
  constructor(private readonly cuentas: ICuentaConectadaRepositorio) {}

  ejecutar(): Promise<CuentaConectada | null> {
    return this.cuentas.obtener("GOOGLE");
  }
}

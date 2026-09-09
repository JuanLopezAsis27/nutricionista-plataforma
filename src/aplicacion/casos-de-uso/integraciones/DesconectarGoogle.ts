import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";

/** Caso de uso: desconectar la cuenta de Google del nutricionista. */
export class DesconectarGoogle {
  constructor(private readonly cuentas: ICuentaConectadaRepositorio) {}

  async ejecutar(): Promise<void> {
    await this.cuentas.eliminar("GOOGLE");
  }
}

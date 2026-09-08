import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";

/** Caso de uso: eliminar un alimento propio individual. */
export class EliminarAlimentoPropio {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const alimento = await this.repositorio.obtenerPorId(id);
    if (!alimento) {
      throw new ErrorAlimentoPropioNoEncontrado(id);
    }
    await this.repositorio.eliminar(id);
  }
}

import type { IObjetivoBioimpedanciaRepositorio } from "@/dominio/repositorios/IObjetivoBioimpedanciaRepositorio";
import { ErrorObjetivoBioimpedanciaNoEncontrado } from "@/dominio/errores/ErrorObjetivoBioimpedanciaNoEncontrado";

/** Caso de uso: dar de baja una meta de bioimpedancia. */
export class EliminarObjetivoBioimpedancia {
  constructor(private readonly objetivos: IObjetivoBioimpedanciaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.objetivos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorObjetivoBioimpedanciaNoEncontrado(id);
    }
    await this.objetivos.eliminar(id);
  }
}

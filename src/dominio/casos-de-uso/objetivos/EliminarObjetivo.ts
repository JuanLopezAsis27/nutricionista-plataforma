import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";

/**
 * Caso de uso: eliminar un objetivo (sus estrategias e historial caen en
 * cascada). Para conservar la traza conviene abandonarlo, no borrarlo.
 */
export class EliminarObjetivo {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.objetivos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorObjetivoNoEncontrado(id);
    }
    await this.objetivos.eliminar(id);
  }
}

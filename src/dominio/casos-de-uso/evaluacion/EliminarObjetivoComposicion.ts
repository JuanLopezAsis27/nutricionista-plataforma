import type { IObjetivoComposicionRepositorio } from "../../repositorios/IObjetivoComposicionRepositorio";
import { ErrorObjetivoComposicionNoEncontrado } from "../../errores/ErrorObjetivoComposicionNoEncontrado";

/** Caso de uso: dar de baja una meta de composición corporal. */
export class EliminarObjetivoComposicion {
  constructor(private readonly objetivos: IObjetivoComposicionRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.objetivos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorObjetivoComposicionNoEncontrado(id);
    }
    await this.objetivos.eliminar(id);
  }
}

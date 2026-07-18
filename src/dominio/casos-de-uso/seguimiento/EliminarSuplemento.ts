import type { ISuplementoRepositorio } from "../../repositorios/ISuplementoRepositorio";
import { ErrorSuplementoNoEncontrado } from "../../errores/ErrorSuplementoNoEncontrado";

/** Caso de uso: eliminar un suplemento (para bajas por error de carga). */
export class EliminarSuplemento {
  constructor(private readonly suplementos: ISuplementoRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.suplementos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorSuplementoNoEncontrado(id);
    }
    await this.suplementos.eliminar(id);
  }
}

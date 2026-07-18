import type { IAlertaAlimentariaRepositorio } from "../../repositorios/IAlertaAlimentariaRepositorio";
import { ErrorAlertaAlimentariaNoEncontrada } from "../../errores/ErrorAlertaAlimentariaNoEncontrada";

/** Caso de uso: eliminar una alerta alimentaria. */
export class EliminarAlertaAlimentaria {
  constructor(private readonly alertas: IAlertaAlimentariaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.alertas.obtenerPorId(id);
    if (!existente) {
      throw new ErrorAlertaAlimentariaNoEncontrada(id);
    }
    await this.alertas.eliminar(id);
  }
}

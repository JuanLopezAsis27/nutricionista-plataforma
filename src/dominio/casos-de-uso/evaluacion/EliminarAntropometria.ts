import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import { ErrorAntropometriaNoEncontrada } from "../../errores/ErrorAntropometriaNoEncontrada";

/** Caso de uso: eliminar una medición antropométrica. */
export class EliminarAntropometria {
  constructor(private readonly antropometrias: IAntropometriaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.antropometrias.obtenerPorId(id);
    if (!existente) {
      throw new ErrorAntropometriaNoEncontrada(id);
    }
    await this.antropometrias.eliminar(id);
  }
}

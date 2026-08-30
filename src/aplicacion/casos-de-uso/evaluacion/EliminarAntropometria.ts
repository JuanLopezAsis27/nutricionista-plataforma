import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import { ErrorAntropometriaNoEncontrada } from "@/dominio/errores/ErrorAntropometriaNoEncontrada";

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

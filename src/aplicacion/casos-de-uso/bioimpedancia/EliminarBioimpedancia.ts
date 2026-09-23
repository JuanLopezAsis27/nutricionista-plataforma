import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import { ErrorBioimpedanciaNoEncontrada } from "@/dominio/errores/ErrorBioimpedanciaNoEncontrada";

/** Caso de uso: eliminar una medición de bioimpedancia. */
export class EliminarBioimpedancia {
  constructor(private readonly bioimpedancias: IBioimpedanciaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.bioimpedancias.obtenerPorId(id);
    if (!existente) {
      throw new ErrorBioimpedanciaNoEncontrada(id);
    }
    await this.bioimpedancias.eliminar(id);
  }
}

import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";

/**
 * Caso de uso: sacar una receta del catálogo. Las copias de los consultorios
 * quedan (FK SET NULL): dejan de saber de dónde salieron, nada más.
 */
export class EliminarRecetaBase {
  constructor(private readonly recetas: IRecetaBaseRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    if (!(await this.recetas.obtenerPorId(id))) {
      throw new ErrorRecetaNoEncontrada(id);
    }
    await this.recetas.eliminar(id);
  }
}

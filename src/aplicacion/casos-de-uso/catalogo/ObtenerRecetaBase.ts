import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";

/** Caso de uso: una receta del catálogo, con sus ingredientes. */
export class ObtenerRecetaBase {
  constructor(private readonly recetas: IRecetaBaseRepositorio) {}

  async ejecutar(id: string): Promise<Receta> {
    const receta = await this.recetas.obtenerPorId(id);
    if (!receta) throw new ErrorRecetaNoEncontrada(id);
    return receta;
  }
}

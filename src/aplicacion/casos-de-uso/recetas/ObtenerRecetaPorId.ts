import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";

/** Caso de uso: obtener una receta por id (falla si no existe). */
export class ObtenerRecetaPorId {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(id: string): Promise<Receta> {
    const receta = await this.recetas.obtenerPorId(id);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(id);
    }
    return receta;
  }
}

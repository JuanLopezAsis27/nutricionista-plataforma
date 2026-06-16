import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import type { Dieta } from "../../entidades/Dieta";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";

/**
 * Caso de uso: obtener una dieta por su id (con sus comidas incluidas).
 * Lanza ErrorDietaNoEncontrada si no existe.
 */
export class ObtenerDietaPorId {
  constructor(private readonly dietas: IDietaRepositorio) {}

  async ejecutar(id: string): Promise<Dieta> {
    const dieta = await this.dietas.obtenerPorId(id);
    if (!dieta) {
      throw new ErrorDietaNoEncontrada(id);
    }
    return dieta;
  }
}

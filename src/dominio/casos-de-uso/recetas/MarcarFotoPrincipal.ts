import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { Receta } from "../../entidades/Receta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";

/**
 * Caso de uso: elegir cuál de las fotos representa la receta.
 *
 * Es la foto de la tarjeta del recetario y la primera de la vista. `null`
 * vuelve al automático (la primera disponible), que es lo que rige mientras el
 * profesional no elija nada.
 *
 * La validación de que la foto sea de esa receta vive en la entidad, no acá:
 * es un invariante de la receta, no una regla de este flujo.
 */
export class MarcarFotoPrincipal {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(recetaId: string, fotoId: string | null): Promise<Receta> {
    const receta = await this.recetas.obtenerPorId(recetaId);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(recetaId);
    }
    // Sin archivos nuevos que vincular: solo cambia cuál es la portada.
    return this.recetas.actualizar(receta.marcarFotoPrincipal(fotoId), []);
  }
}

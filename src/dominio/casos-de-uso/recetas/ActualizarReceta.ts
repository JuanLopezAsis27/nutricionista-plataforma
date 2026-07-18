import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { Receta, DatosNuevaReceta } from "../../entidades/Receta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";

/** Datos de entrada: id + datos de la receta + fotos nuevas ya subidas. */
export interface DatosActualizarReceta extends DatosNuevaReceta {
  id: string;
  fotoIdsNuevos?: string[];
}

/**
 * Caso de uso: actualizar una receta existente.
 * Las fotos nuevas se vinculan; las viejas se conservan (se quitan aparte).
 */
export class ActualizarReceta {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(datos: DatosActualizarReceta): Promise<Receta> {
    const existente = await this.recetas.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorRecetaNoEncontrada(datos.id);
    }
    const actualizada = existente.actualizar(datos);
    return this.recetas.actualizar(actualizada, datos.fotoIdsNuevos ?? []);
  }
}

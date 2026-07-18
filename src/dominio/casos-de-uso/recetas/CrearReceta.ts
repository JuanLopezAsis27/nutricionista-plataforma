import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import { Receta, type DatosNuevaReceta } from "../../entidades/Receta";

/** Datos de entrada: la receta + ids de fotos ya subidas al bucket. */
export interface DatosCrearReceta extends DatosNuevaReceta {
  fotoIds?: string[];
}

/**
 * Caso de uso: crear una receta del recetario.
 * Las fotos se suben antes (módulo Archivos) y acá solo se vinculan.
 */
export class CrearReceta {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(datos: DatosCrearReceta): Promise<Receta> {
    const receta = Receta.crear(datos, crypto.randomUUID());
    return this.recetas.crear(receta, datos.fotoIds ?? []);
  }
}

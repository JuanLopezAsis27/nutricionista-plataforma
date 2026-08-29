import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { Receta, DatosNuevaReceta } from "../../entidades/Receta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";

/** Datos de entrada: id + datos de la receta + fotos/documentos nuevos ya subidos. */
export interface DatosActualizarReceta extends DatosNuevaReceta {
  id: string;
  fotoIdsNuevos?: string[];
  documentoIdsNuevos?: string[];
}

/**
 * Caso de uso: actualizar una receta existente.
 * Los archivos nuevos (fotos y documentos) se vinculan; los viejos se conservan.
 */
export class ActualizarReceta {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(datos: DatosActualizarReceta): Promise<Receta> {
    const existente = await this.recetas.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorRecetaNoEncontrada(datos.id);
    }
    const actualizada = existente.actualizar(datos);
    const archivoIds = [
      ...(datos.fotoIdsNuevos ?? []),
      ...(datos.documentoIdsNuevos ?? []),
    ];
    return this.recetas.actualizar(actualizada, archivoIds);
  }
}

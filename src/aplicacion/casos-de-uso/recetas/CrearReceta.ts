import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import { Receta, type DatosNuevaReceta } from "@/dominio/entidades/Receta";
import { marcarPortada } from "./marcarPortada";

/** Datos de entrada: la receta + ids de fotos y documentos ya subidos al bucket. */
export interface DatosCrearReceta extends DatosNuevaReceta {
  fotoIds?: string[];
  documentoIds?: string[];
  /** Portada elegida entre `fotoIds`. Sin esto rige el automático (la primera). */
  fotoPrincipalId?: string;
}

/**
 * Caso de uso: crear una receta del recetario.
 * Las fotos y documentos se suben antes (módulo Archivos) y acá solo se
 * vinculan a la receta (el repositorio los separa por tipo al leer).
 */
export class CrearReceta {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(datos: DatosCrearReceta): Promise<Receta> {
    const receta = Receta.crear(datos, crypto.randomUUID());
    const archivoIds = [
      ...(datos.fotoIds ?? []),
      ...(datos.documentoIds ?? []),
    ];
    const creada = await this.recetas.crear(receta, archivoIds);
    return marcarPortada(this.recetas, creada, datos.fotoPrincipalId);
  }
}

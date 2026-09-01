import type { GrupoReceta } from "../entidades/GrupoReceta";

/** Una carpeta con cuántas recetas tiene adentro. */
export interface GrupoRecetaConTotal {
  grupo: GrupoReceta;
  cantidadRecetas: number;
}

/**
 * Contrato del repositorio de carpetas de recetas (puerto de salida).
 *
 * `eliminar` NO se lleva las recetas: la FK es SET NULL y quedan sueltas. Una
 * carpeta es cómo están ordenadas, no de quién son.
 */
export interface IGrupoRecetaRepositorio {
  crear(grupo: GrupoReceta): Promise<GrupoReceta>;
  actualizar(grupo: GrupoReceta): Promise<GrupoReceta>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<GrupoReceta | null>;
  listar(): Promise<GrupoRecetaConTotal[]>;
  /** ¿Ya hay una carpeta con ese nombre? `excluirId` la deja renombrarse a sí misma. */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
}

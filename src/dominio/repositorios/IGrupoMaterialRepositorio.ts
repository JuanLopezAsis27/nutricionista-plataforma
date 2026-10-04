import type { GrupoMaterial } from "../entidades/GrupoMaterial";

/** Una carpeta con cuántos materiales tiene adentro. */
export interface GrupoMaterialConTotal {
  grupo: GrupoMaterial;
  cantidadMateriales: number;
}

/**
 * Contrato del repositorio de carpetas de la biblioteca (puerto de salida).
 *
 * `eliminar` NO se lleva los materiales: la FK es SET NULL y quedan sueltos.
 * Una carpeta es cómo están ordenados, no de quién son.
 */
export interface IGrupoMaterialRepositorio {
  crear(grupo: GrupoMaterial): Promise<GrupoMaterial>;
  actualizar(grupo: GrupoMaterial): Promise<GrupoMaterial>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<GrupoMaterial | null>;
  listar(): Promise<GrupoMaterialConTotal[]>;
  /** ¿Ya hay una carpeta con ese nombre? `excluirId` la deja renombrarse a sí misma. */
  existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
}

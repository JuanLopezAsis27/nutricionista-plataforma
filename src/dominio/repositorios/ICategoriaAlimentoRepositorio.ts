import type { CategoriaAlimento } from "../entidades/CategoriaAlimento";

/**
 * Contrato de persistencia de una lista de categorías de alimento (migración
 * 93). Lo implementan las PREDETERMINADAS de la plataforma y las PROPIAS de un
 * consultorio: son la misma colección con otro dueño, como las dos listas de
 * alimentos (`IAlimentoPropioRepositorio`).
 *
 * `eliminar` no se lleva los alimentos: la FK es SET NULL y quedan sin
 * categoría.
 */
export interface ICategoriaAlimentoRepositorio {
  crear(categoria: CategoriaAlimento): Promise<CategoriaAlimento>;
  /** Escribe nombre y orden. */
  actualizar(categoria: CategoriaAlimento): Promise<CategoriaAlimento>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<CategoriaAlimento | null>;
  /** Las predeterminadas por `orden`; las propias por nombre. */
  listar(): Promise<CategoriaAlimento[]>;
  /**
   * ¿Ya hay una con ese nombre (`claveNombre`: sin mayúsculas ni tildes)?
   * `excluirId` deja renombrarse a sí misma.
   */
  existeNombre(claveNombre: string, excluirId?: string): Promise<boolean>;
}

import type { AlimentoPropio } from "../entidades/AlimentoPropio";

/** Criterios opcionales de paginación y búsqueda para listar la gestión. */
export interface FiltroAlimentosPropios {
  busqueda?: string;
  limite?: number;
  desplazamiento?: number;
}

/** Contrato de persistencia de los alimentos propios del nutricionista. */
export interface IAlimentoPropioRepositorio {
  /**
   * Reemplaza TODA la lista del inquilino por la nueva (borra la anterior e
   * inserta las nuevas de forma atómica). Devuelve cuántos quedaron.
   */
  reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number>;
  /** Alta de un alimento individual (gestión manual de la lista). */
  crear(alimento: AlimentoPropio): Promise<AlimentoPropio>;
  /** Edición de un alimento individual. */
  actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio>;
  /** Baja de un alimento individual. */
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<AlimentoPropio | null>;
  /** Listado paginado (con búsqueda opcional) para la pantalla de gestión. */
  listar(filtro?: FiltroAlimentosPropios): Promise<AlimentoPropio[]>;
  /** Busca por texto en el nombre (case-insensitive). Máximo `limite`. */
  buscar(termino: string, limite: number): Promise<AlimentoPropio[]>;
  /** Cantidad de alimentos cargados por el inquilino (con el mismo filtro que `listar`). */
  contar(filtro?: FiltroAlimentosPropios): Promise<number>;
  /** Borra toda la lista del inquilino (reactiva Open Food Facts). */
  vaciar(): Promise<void>;
}

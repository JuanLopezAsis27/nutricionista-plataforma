import type { AlimentoPropio } from "../entidades/AlimentoPropio";

/** Contrato de persistencia de los alimentos propios del nutricionista. */
export interface IAlimentoPropioRepositorio {
  /**
   * Reemplaza TODA la lista del inquilino por la nueva (borra la anterior e
   * inserta las nuevas de forma atómica). Devuelve cuántos quedaron.
   */
  reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number>;
  /** Busca por texto en el nombre (case-insensitive). Máximo `limite`. */
  buscar(termino: string, limite: number): Promise<AlimentoPropio[]>;
  /** Cantidad de alimentos cargados por el inquilino. */
  contar(): Promise<number>;
  /** Borra toda la lista del inquilino (reactiva FatSecret/OFF). */
  vaciar(): Promise<void>;
}

import type { AxiomaNutricional } from "../entidades/AxiomaNutricional";

/** Contrato de persistencia de los axiomas / base de conocimiento. */
export interface IAxiomaRepositorio {
  crear(axioma: AxiomaNutricional): Promise<AxiomaNutricional>;
  actualizar(axioma: AxiomaNutricional): Promise<AxiomaNutricional>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<AxiomaNutricional | null>;
  /** Todos los axiomas, orden por prioridad desc y luego creación. */
  listar(): Promise<AxiomaNutricional[]>;
  /** Solo los activos (los que miden el tracking y alimentan a la IA). */
  listarActivos(): Promise<AxiomaNutricional[]>;
}

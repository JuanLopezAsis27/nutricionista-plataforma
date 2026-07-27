import type { IAxiomaRepositorio } from "../../repositorios/IAxiomaRepositorio";
import type { AxiomaNutricional } from "../../entidades/AxiomaNutricional";

/**
 * Caso de uso: listar los axiomas activos. Fuente de las reglas que miden el
 * tracking del paciente hoy y, a futuro, del contexto para la IA.
 */
export class ListarAxiomasActivos {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  ejecutar(): Promise<AxiomaNutricional[]> {
    return this.repo.listarActivos();
  }
}

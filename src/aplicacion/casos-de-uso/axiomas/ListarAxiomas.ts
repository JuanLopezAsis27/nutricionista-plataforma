import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";

/** Caso de uso: listar todos los axiomas (para la gestión del nutricionista). */
export class ListarAxiomas {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  ejecutar(): Promise<AxiomaNutricional[]> {
    return this.repo.listar();
  }
}

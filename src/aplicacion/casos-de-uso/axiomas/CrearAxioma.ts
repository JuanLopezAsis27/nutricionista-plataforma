import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import {
  AxiomaNutricional,
  type DatosNuevoAxioma,
} from "@/dominio/entidades/AxiomaNutricional";

/** Caso de uso: crear un axioma de la base de conocimiento. */
export class CrearAxioma {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  async ejecutar(datos: DatosNuevoAxioma): Promise<AxiomaNutricional> {
    return this.repo.crear(AxiomaNutricional.crear(datos, crypto.randomUUID()));
  }
}

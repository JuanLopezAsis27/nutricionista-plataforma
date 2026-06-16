import type { IDietaRepositorio } from "../../repositorios/IDietaRepositorio";
import type { Dieta } from "../../entidades/Dieta";

/**
 * Caso de uso: listar todas las dietas (plantillas) con sus comidas.
 * El repositorio incluye las comidas en cada dieta.
 */
export class ObtenerDietas {
  constructor(private readonly dietas: IDietaRepositorio) {}

  async ejecutar(): Promise<Dieta[]> {
    return this.dietas.listar();
  }
}

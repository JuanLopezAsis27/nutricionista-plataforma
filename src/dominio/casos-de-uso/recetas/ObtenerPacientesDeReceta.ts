import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";

/** Caso de uso: ids de los pacientes con los que se compartió una receta. */
export class ObtenerPacientesDeReceta {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(recetaId: string): Promise<string[]> {
    return this.recetas.listarPacientesAsignados(recetaId);
  }
}

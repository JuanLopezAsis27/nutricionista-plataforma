import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { Receta } from "../../entidades/Receta";

/** Caso de uso: recetas compartidas con un paciente (portal). */
export class ObtenerRecetasDelPaciente {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(pacienteId: string): Promise<Receta[]> {
    return this.recetas.listarPorPaciente(pacienteId);
  }
}

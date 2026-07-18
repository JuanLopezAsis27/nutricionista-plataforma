import type {
  IRecetaRepositorio,
  FiltroRecetas,
} from "../../repositorios/IRecetaRepositorio";
import type { Receta } from "../../entidades/Receta";

/** Caso de uso: listar recetas del recetario, con filtro opcional. */
export class ObtenerRecetas {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(filtro?: FiltroRecetas): Promise<Receta[]> {
    return this.recetas.listar(filtro);
  }
}

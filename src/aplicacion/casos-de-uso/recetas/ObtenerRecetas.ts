import type {
  IRecetaRepositorio,
  FiltroRecetas,
} from "@/dominio/repositorios/IRecetaRepositorio";
import type { Receta } from "@/dominio/entidades/Receta";

/** Caso de uso: listar recetas del recetario, con filtro opcional. */
export class ObtenerRecetas {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(filtro?: FiltroRecetas): Promise<Receta[]> {
    return this.recetas.listar(filtro);
  }
}

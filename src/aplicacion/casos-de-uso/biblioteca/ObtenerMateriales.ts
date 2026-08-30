import type {
  IMaterialRepositorio,
  FiltroMateriales,
} from "@/dominio/repositorios/IMaterialRepositorio";
import type { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";

/** Caso de uso: listar los materiales de la biblioteca, con filtro opcional. */
export class ObtenerMateriales {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(filtro?: FiltroMateriales): Promise<MaterialBiblioteca[]> {
    return this.materiales.listar(filtro);
  }
}

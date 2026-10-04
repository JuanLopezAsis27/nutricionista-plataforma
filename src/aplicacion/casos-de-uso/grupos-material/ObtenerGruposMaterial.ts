import type {
  IGrupoMaterialRepositorio,
  GrupoMaterialConTotal,
} from "@/dominio/repositorios/IGrupoMaterialRepositorio";

/** Caso de uso: carpetas de la biblioteca, con cuántos materiales tiene cada una. */
export class ObtenerGruposMaterial {
  constructor(private readonly grupos: IGrupoMaterialRepositorio) {}

  async ejecutar(): Promise<GrupoMaterialConTotal[]> {
    return this.grupos.listar();
  }
}

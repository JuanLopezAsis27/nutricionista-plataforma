import type {
  IGrupoRecetaRepositorio,
  GrupoRecetaConTotal,
} from "@/dominio/repositorios/IGrupoRecetaRepositorio";

/** Caso de uso: carpetas del recetario, con cuántas recetas tiene cada una. */
export class ObtenerGruposReceta {
  constructor(private readonly grupos: IGrupoRecetaRepositorio) {}

  async ejecutar(): Promise<GrupoRecetaConTotal[]> {
    return this.grupos.listar();
  }
}

import type {
  IGrupoPlanRepositorio,
  GrupoPlanConTotal,
} from "@/dominio/repositorios/IGrupoPlanRepositorio";

/** Caso de uso: carpetas del consultorio, con cuántos planes tiene cada una. */
export class ObtenerGruposPlan {
  constructor(private readonly grupos: IGrupoPlanRepositorio) {}

  async ejecutar(): Promise<GrupoPlanConTotal[]> {
    return this.grupos.listar();
  }
}

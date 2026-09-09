import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { ErrorCompetenciaNoEncontrada } from "@/dominio/errores/ErrorCompetenciaNoEncontrada";

/** Caso de uso: eliminar una competencia del calendario. */
export class EliminarCompetencia {
  constructor(private readonly competencias: ICompetenciaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.competencias.obtenerPorId(id);
    if (!existente) {
      throw new ErrorCompetenciaNoEncontrada(id);
    }
    await this.competencias.eliminar(id);
  }
}

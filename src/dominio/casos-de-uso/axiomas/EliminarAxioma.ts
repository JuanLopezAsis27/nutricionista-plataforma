import type { IAxiomaRepositorio } from "../../repositorios/IAxiomaRepositorio";
import { ErrorAxiomaNoEncontrado } from "../../errores/ErrorAxiomaNoEncontrado";

/** Caso de uso: eliminar un axioma de la base de conocimiento. */
export class EliminarAxioma {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const axioma = await this.repo.obtenerPorId(id);
    if (!axioma) {
      throw new ErrorAxiomaNoEncontrado(id);
    }
    await this.repo.eliminar(id);
  }
}

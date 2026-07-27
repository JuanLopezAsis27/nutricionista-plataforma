import type { IAxiomaRepositorio } from "../../repositorios/IAxiomaRepositorio";
import { AxiomaNutricional, type DatosNuevoAxioma } from "../../entidades/AxiomaNutricional";
import { ErrorAxiomaNoEncontrado } from "../../errores/ErrorAxiomaNoEncontrado";

/** Caso de uso: editar un axioma existente. */
export class ActualizarAxioma {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  async ejecutar(id: string, cambios: Partial<DatosNuevoAxioma>): Promise<AxiomaNutricional> {
    const axioma = await this.repo.obtenerPorId(id);
    if (!axioma) {
      throw new ErrorAxiomaNoEncontrado(id);
    }
    return this.repo.actualizar(axioma.actualizar(cambios));
  }
}

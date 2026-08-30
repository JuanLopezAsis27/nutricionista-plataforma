import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import {
  AxiomaNutricional,
  type DatosNuevoAxioma,
} from "@/dominio/entidades/AxiomaNutricional";
import { ErrorAxiomaNoEncontrado } from "@/dominio/errores/ErrorAxiomaNoEncontrado";

/** Caso de uso: editar un axioma existente. */
export class ActualizarAxioma {
  constructor(private readonly repo: IAxiomaRepositorio) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosNuevoAxioma>,
  ): Promise<AxiomaNutricional> {
    const axioma = await this.repo.obtenerPorId(id);
    if (!axioma) {
      throw new ErrorAxiomaNoEncontrado(id);
    }
    return this.repo.actualizar(axioma.actualizar(cambios));
  }
}

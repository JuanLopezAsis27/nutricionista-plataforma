import type { IGrupoPlanRepositorio } from "../../repositorios/IGrupoPlanRepositorio";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";

/**
 * Caso de uso: borrar una carpeta de planes.
 *
 * No exige que esté vacía y no se lleva los planes: la FK es SET NULL y quedan
 * sueltos, listos para volver a agruparse. Una carpeta es cómo están ordenados,
 * no de quién son; borrar el contenido al tirar el rótulo sería una pérdida de
 * datos disfrazada de organización.
 */
export class EliminarGrupoPlan {
  constructor(private readonly grupos: IGrupoPlanRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.grupos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorGrupoPlanNoEncontrado(id);
    }
    await this.grupos.eliminar(id);
  }
}

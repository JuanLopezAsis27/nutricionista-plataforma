import type { IGrupoMaterialRepositorio } from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";

/**
 * Caso de uso: borrar una carpeta de la biblioteca.
 *
 * No exige que esté vacía y no se lleva los materiales: la FK es SET NULL y quedan
 * sueltos, listos para volver a agruparse. Una carpeta es cómo están ordenadas,
 * no de quién son; borrar el contenido al tirar el rótulo sería una pérdida de
 * datos disfrazada de organización.
 */
export class EliminarGrupoMaterial {
  constructor(private readonly grupos: IGrupoMaterialRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.grupos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorGrupoMaterialNoEncontrado(id);
    }
    await this.grupos.eliminar(id);
  }
}

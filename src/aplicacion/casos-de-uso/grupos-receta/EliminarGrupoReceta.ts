import type { IGrupoRecetaRepositorio } from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import { ErrorGrupoRecetaNoEncontrado } from "@/dominio/errores/ErrorGrupoRecetaNoEncontrado";

/**
 * Caso de uso: borrar una carpeta del recetario.
 *
 * No exige que esté vacía y no se lleva las recetas: la FK es SET NULL y quedan
 * sueltas, listas para volver a agruparse. Una carpeta es cómo están ordenadas,
 * no de quién son; borrar el contenido al tirar el rótulo sería una pérdida de
 * datos disfrazada de organización.
 */
export class EliminarGrupoReceta {
  constructor(private readonly grupos: IGrupoRecetaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.grupos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorGrupoRecetaNoEncontrado(id);
    }
    await this.grupos.eliminar(id);
  }
}

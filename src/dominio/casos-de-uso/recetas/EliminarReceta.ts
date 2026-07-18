import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";

/**
 * Caso de uso: eliminar una receta y sus fotos.
 * Las filas de archivos y asignaciones caen en cascada; los objetos del bucket
 * se borran explícitamente después (si alguno falla, la limpieza semanal de
 * huérfanos lo recoge).
 */
export class EliminarReceta {
  constructor(
    private readonly recetas: IRecetaRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const receta = await this.recetas.obtenerPorId(id);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(id);
    }

    const fotos = await this.archivos.listarPorDueno({ recetaId: id });
    await this.recetas.eliminar(id);

    for (const foto of fotos) {
      await this.almacenamiento.eliminar(foto.clave);
    }
  }
}

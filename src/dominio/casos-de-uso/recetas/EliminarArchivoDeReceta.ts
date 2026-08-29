import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import type { Receta } from "../../entidades/Receta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";
import { ErrorArchivoNoEncontrado } from "../../errores/ErrorArchivoNoEncontrado";

/**
 * Caso de uso: borrar una foto o un documento de una receta.
 *
 * Es un borrado real —fila y objeto del bucket—, no un desvinculado: un
 * adjunto suelto sin dueño no se ve desde ningún lado y solo ocupa lugar.
 *
 * Comprueba que el archivo sea DE ESA receta antes de tocarlo. Sin esa
 * verificación, el endpoint sería un borrado de archivos por id: la extensión
 * multi-inquilino evita que sea de otro consultorio, pero no que sea el
 * laboratorio de un paciente.
 *
 * Si la foto borrada era la principal, la receta vuelve a la elección
 * automática (la primera disponible) — de eso ya se encarga la FK con
 * ON DELETE SET NULL, así que acá no hay que acordarse de limpiarla.
 */
export class EliminarArchivoDeReceta {
  constructor(
    private readonly recetas: IRecetaRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(recetaId: string, archivoId: string): Promise<Receta> {
    const receta = await this.recetas.obtenerPorId(recetaId);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(recetaId);
    }
    if (!receta.tieneArchivo(archivoId)) {
      throw new ErrorArchivoNoEncontrado(archivoId);
    }

    const archivo = await this.archivos.obtenerPorId(archivoId);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(archivoId);
    }

    // Primero la fila, después el objeto: si falla el bucket queda un huérfano
    // que la limpieza semanal recoge, mientras que lo inverso —objeto sin
    // fila— dejaría una foto visible que la app ya no sabe borrar.
    await this.archivos.eliminar(archivoId);
    await this.almacenamiento.eliminar(archivo.clave);

    const actualizada = await this.recetas.obtenerPorId(recetaId);
    return actualizada ?? receta;
  }
}

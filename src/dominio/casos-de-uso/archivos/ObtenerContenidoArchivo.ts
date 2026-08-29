import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import type { Archivo } from "../../entidades/Archivo";
import { ErrorArchivoNoEncontrado } from "../../errores/ErrorArchivoNoEncontrado";

/** El archivo con su contenido, para servirlo desde la app. */
export interface ArchivoConContenido {
  archivo: Archivo;
  contenido: Uint8Array;
}

/**
 * Caso de uso: traer el contenido de un archivo para servirlo desde la app.
 *
 * Distinto de `ObtenerUrlArchivo`, que delega la descarga en el bucket con una
 * URL firmada: eso sirve para bajar un adjunto, pero no para MOSTRARLO dentro
 * de la app, porque la URL firmada es de otro origen y el visor embebido queda
 * atado a las cabeceras del bucket. Acá el contenido pasa por el servidor y
 * sale con el mismo origen que la página.
 *
 * La autorización (quién puede ver qué archivo) se resuelve en la capa de
 * presentación, igual que en `ObtenerUrlArchivo`.
 */
export class ObtenerContenidoArchivo {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<ArchivoConContenido> {
    const archivo = await this.archivos.obtenerPorId(id);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(id);
    }
    const contenido = await this.almacenamiento.descargar(archivo.clave);
    return { archivo, contenido };
  }
}

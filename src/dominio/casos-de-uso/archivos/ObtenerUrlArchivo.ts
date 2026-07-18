import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import type { Archivo } from "../../entidades/Archivo";
import { ErrorArchivoNoEncontrado } from "../../errores/ErrorArchivoNoEncontrado";

/** Resultado: el archivo y una URL firmada de lectura temporal. */
export interface ArchivoConUrl {
  archivo: Archivo;
  url: string;
}

/**
 * Caso de uso: obtener una URL firmada de solo lectura para un archivo.
 * La autorización (quién puede ver qué archivo) se resuelve en la capa de
 * presentación según el dueño del archivo; acá solo se genera la URL.
 */
export class ObtenerUrlArchivo {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string, expiraEnSegundos = 60): Promise<ArchivoConUrl> {
    const archivo = await this.archivos.obtenerPorId(id);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(id);
    }
    const url = await this.almacenamiento.generarUrlLectura(
      archivo.clave,
      expiraEnSegundos,
    );
    return { archivo, url };
  }
}

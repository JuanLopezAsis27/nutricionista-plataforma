import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type {
  IAlmacenamientoArchivos,
  LecturaArchivo,
} from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { Archivo } from "@/dominio/entidades/Archivo";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";

/** El archivo con su contenido abierto como flujo. */
export interface ArchivoEnLectura {
  archivo: Archivo;
  lectura: LecturaArchivo;
}

/**
 * Caso de uso: abrir un archivo para servirlo desde la app a medida que llega
 * del bucket.
 *
 * Es el que usan las rutas de ver y bajar. `ObtenerContenidoArchivo` sigue
 * existiendo para lo que necesita el archivo ENTERO en memoria —convertir un
 * Word a HTML—; ver `IAlmacenamientoArchivos.abrirLectura` para el porqué.
 *
 * La autorización (quién puede ver qué archivo) se resuelve en la capa de
 * presentación ANTES de llamar a este caso de uso, igual que en los otros
 * dos de lectura.
 */
export class AbrirLecturaArchivo {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<ArchivoEnLectura> {
    const archivo = await this.archivos.obtenerPorId(id);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(id);
    }
    const lectura = await this.almacenamiento.abrirLectura(archivo.clave);
    return { archivo, lectura };
  }
}

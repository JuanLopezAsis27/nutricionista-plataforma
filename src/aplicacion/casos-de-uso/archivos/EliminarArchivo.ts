import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";

/**
 * Caso de uso: eliminar un archivo (metadatos + objeto del bucket).
 *
 * Orden: primero la fila, después el objeto. Si el borrado del bucket falla,
 * queda un objeto huérfano que la limpieza semanal recoge; lo inverso (fila
 * sin objeto) rompería las URLs y por eso se evita.
 */
export class EliminarArchivo {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const archivo = await this.archivos.obtenerPorId(id);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(id);
    }
    await this.archivos.eliminar(id);
    await this.almacenamiento.eliminar(archivo.clave);
  }
}

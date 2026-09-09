import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { ErrorGrabacionNoEncontrada } from "@/dominio/errores/ErrorGrabacionNoEncontrada";

/**
 * Caso de uso: borrar una grabación y su audio.
 *
 * El orden es fila → bucket, con la misma lógica que el resto del sistema: la
 * fila cae en cascada con el archivo, y el objeto del bucket se borra después.
 * Si ese último paso falla, la limpieza semanal de huérfanos lo recoge; al
 * revés, un objeto borrado con la fila viva sería una grabación que la pantalla
 * ofrece escuchar y no se puede reproducir.
 *
 * NO regenera el resumen. Es material clínico ya generado y revisado, y
 * reescribirlo solo porque se borró un audio le cambiaría el contenido al
 * profesional sin que lo haya pedido; la pantalla marca que quedó
 * desactualizado y él decide.
 */
export class EliminarGrabacion {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const grabacion = await this.grabaciones.obtenerPorId(id);
    if (!grabacion) {
      throw new ErrorGrabacionNoEncontrada(id);
    }

    const archivoId = grabacion.aPrimitivos().archivoId;
    const archivo =
      archivoId != null ? await this.archivos.obtenerPorId(archivoId) : null;

    await this.grabaciones.eliminar(id);

    if (archivo) {
      await this.almacenamiento.eliminar(archivo.clave);
    }
  }
}

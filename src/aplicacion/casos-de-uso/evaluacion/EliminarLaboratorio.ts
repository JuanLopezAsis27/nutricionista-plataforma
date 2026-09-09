import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { ErrorLaboratorioNoEncontrado } from "@/dominio/errores/ErrorLaboratorioNoEncontrado";

/**
 * Caso de uso: eliminar un laboratorio y sus adjuntos.
 * Las filas de archivos caen en cascada con el laboratorio; los objetos del
 * bucket se eliminan explícitamente después (si alguno falla, la limpieza
 * semanal de huérfanos lo recoge).
 */
export class EliminarLaboratorio {
  constructor(
    private readonly laboratorios: ILaboratorioRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const laboratorio = await this.laboratorios.obtenerPorId(id);
    if (!laboratorio) {
      throw new ErrorLaboratorioNoEncontrado(id);
    }

    const adjuntos = await this.archivos.listarPorDueno({ laboratorioId: id });
    await this.laboratorios.eliminar(id);

    for (const adjunto of adjuntos) {
      await this.almacenamiento.eliminar(adjunto.clave);
    }
  }
}

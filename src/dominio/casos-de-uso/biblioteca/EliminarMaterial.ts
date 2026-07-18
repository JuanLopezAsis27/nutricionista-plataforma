import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import { ErrorMaterialNoEncontrado } from "../../errores/ErrorMaterialNoEncontrado";

/**
 * Caso de uso: eliminar un material y su archivo del bucket (si tiene).
 * La fila del archivo y las asignaciones caen en cascada; el objeto del
 * bucket se borra explícitamente después (si falla, lo recoge la limpieza
 * semanal de huérfanos).
 */
export class EliminarMaterial {
  constructor(
    private readonly materiales: IMaterialRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const material = await this.materiales.obtenerPorId(id);
    if (!material) {
      throw new ErrorMaterialNoEncontrado(id);
    }

    const adjuntos = await this.archivos.listarPorDueno({ materialId: id });
    await this.materiales.eliminar(id);

    for (const adjunto of adjuntos) {
      await this.almacenamiento.eliminar(adjunto.clave);
    }
  }
}

import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";

/** Caso de uso: archivar o desarchivar un plan (lo saca del listado activo). */
export class ArchivarPlan {
  constructor(private readonly planes: IPlanRepositorio) {}

  async ejecutar(datos: { id: string; archivado: boolean }): Promise<void> {
    const existente = await this.planes.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorPlanNoEncontrado(datos.id);
    }
    await this.planes.marcarArchivado(datos.id, datos.archivado);
  }
}

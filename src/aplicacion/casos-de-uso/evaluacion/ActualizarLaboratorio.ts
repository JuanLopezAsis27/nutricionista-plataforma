import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type {
  Laboratorio,
  DatosNuevoLaboratorio,
} from "@/dominio/entidades/Laboratorio";
import { ErrorLaboratorioNoEncontrado } from "@/dominio/errores/ErrorLaboratorioNoEncontrado";

/** Cambios aplicables a un laboratorio existente. */
export interface CambiosLaboratorio extends Partial<
  Omit<DatosNuevoLaboratorio, "pacienteId">
> {
  /** Archivos nuevos a vincular (los existentes se quitan con EliminarArchivo). */
  archivoIdsNuevos?: string[];
}

/** Caso de uso: actualizar un laboratorio y vincular adjuntos nuevos. */
export class ActualizarLaboratorio {
  constructor(private readonly laboratorios: ILaboratorioRepositorio) {}

  async ejecutar(
    id: string,
    cambios: CambiosLaboratorio,
  ): Promise<Laboratorio> {
    const existente = await this.laboratorios.obtenerPorId(id);
    if (!existente) {
      throw new ErrorLaboratorioNoEncontrado(id);
    }
    const actualizado = existente.actualizar(cambios);
    return this.laboratorios.actualizar(
      actualizado,
      cambios.archivoIdsNuevos ?? [],
    );
  }
}

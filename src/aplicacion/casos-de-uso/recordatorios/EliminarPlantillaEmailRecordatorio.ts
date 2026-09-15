import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import { ErrorPlantillaEmailRecordatorioNoEncontrada } from "@/dominio/errores/ErrorPlantillaEmailRecordatorioNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: borrar una plantilla de recordatorio por email.
 *
 * La predeterminada no se puede borrar: dejaría al envío automático (y a los
 * manuales) sin con qué mandar. Para reemplazarla hay que marcar otra primero.
 */
export class EliminarPlantillaEmailRecordatorio {
  constructor(
    private readonly plantillas: IPlantillaEmailRecordatorioRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaEmailRecordatorioNoEncontrada(id);
    }
    if (plantilla.predeterminada) {
      throw new ErrorValidacion(
        "No se puede borrar la plantilla predeterminada. Marcá otra como predeterminada primero.",
      );
    }
    await this.plantillas.eliminar(id);
  }
}

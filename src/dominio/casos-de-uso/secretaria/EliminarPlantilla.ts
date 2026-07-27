import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: eliminar una plantilla. Las plantillas de sistema
 * (RECORDATORIO_TURNO, BIENVENIDA) no se pueden borrar.
 */
export class EliminarPlantilla {
  constructor(private readonly plantillas: IPlantillaEmailRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(id);
    }
    if (plantilla.deSistema) {
      throw new ErrorValidacion("Las plantillas de sistema no se pueden eliminar.");
    }
    await this.plantillas.eliminar(id);
  }
}

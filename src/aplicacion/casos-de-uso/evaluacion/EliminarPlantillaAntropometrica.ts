import type { IPlantillaAntropometricaRepositorio } from "@/dominio/repositorios/IPlantillaAntropometricaRepositorio";
import { ErrorPlantillaAntropometricaNoEncontrada } from "@/dominio/errores/ErrorPlantillaAntropometricaNoEncontrada";

/**
 * Caso de uso: borrar una plantilla de carga.
 * No toca las mediciones ya cargadas: la plantilla solo decide qué campos se
 * muestran en el formulario, no qué se guardó.
 */
export class EliminarPlantillaAntropometrica {
  constructor(
    private readonly plantillas: IPlantillaAntropometricaRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.plantillas.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPlantillaAntropometricaNoEncontrada(id);
    }
    await this.plantillas.eliminar(id);
  }
}

import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { PlantillaEmail } from "../../entidades/PlantillaEmail";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";

/** Caso de uso: obtener una plantilla por su id. */
export class ObtenerPlantilla {
  constructor(private readonly plantillas: IPlantillaEmailRepositorio) {}

  async ejecutar(id: string): Promise<PlantillaEmail> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(id);
    }
    return plantilla;
  }
}

import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import { ErrorPlantillaNoEncontrada } from "@/dominio/errores/ErrorPlantillaNoEncontrada";

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

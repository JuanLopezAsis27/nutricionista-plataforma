import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { PlantillaEmail } from "../../entidades/PlantillaEmail";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";

/** Cambios permitidos al editar una plantilla (nunca la clave). */
export interface CambiosPlantilla {
  id: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  descripcion?: string | null;
}

/**
 * Caso de uso: editar el contenido de una plantilla. La clave y `deSistema`
 * se preservan; solo cambian nombre, asunto, cuerpo y descripción.
 */
export class ActualizarPlantilla {
  constructor(private readonly plantillas: IPlantillaEmailRepositorio) {}

  async ejecutar(cambios: CambiosPlantilla): Promise<PlantillaEmail> {
    const plantilla = await this.plantillas.obtenerPorId(cambios.id);
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(cambios.id);
    }

    const actualizada = plantilla.actualizar({
      nombre: cambios.nombre,
      asunto: cambios.asunto,
      cuerpoHtml: cambios.cuerpoHtml,
      descripcion: cambios.descripcion,
    });
    return this.plantillas.actualizar(actualizada);
  }
}

import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import { PlantillaEmail, type DatosNuevaPlantilla } from "../../entidades/PlantillaEmail";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: crear una plantilla de email personalizada. La clave debe ser
 * única; las plantillas creadas acá nunca son de sistema.
 */
export class CrearPlantilla {
  constructor(private readonly plantillas: IPlantillaEmailRepositorio) {}

  async ejecutar(datos: Omit<DatosNuevaPlantilla, "deSistema">): Promise<PlantillaEmail> {
    const plantilla = PlantillaEmail.crear({ ...datos, deSistema: false }, crypto.randomUUID());

    const existente = await this.plantillas.obtenerPorClave(plantilla.clave);
    if (existente) {
      throw new ErrorValidacion(`Ya existe una plantilla con la clave «${plantilla.clave}».`);
    }

    return this.plantillas.crear(plantilla);
  }
}

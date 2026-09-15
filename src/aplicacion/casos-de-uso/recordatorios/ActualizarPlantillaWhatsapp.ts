import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { DatosPlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";
import { liberarDiaDeOtras } from "./diaAsignado";

/** Caso de uso: editar una plantilla de recordatorio por WhatsApp. */
export class ActualizarPlantillaWhatsapp {
  constructor(private readonly plantillas: IPlantillaWhatsappRepositorio) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosPlantillaWhatsapp>,
  ): Promise<PlantillaWhatsapp> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaWhatsappNoEncontrada(id);
    }
    if (cambios.predeterminada) {
      await desmarcarOtrasPredeterminadas(
        this.plantillas,
        await this.plantillas.listar(),
        id,
      );
    }
    if (cambios.diasAntes != null) {
      await liberarDiaDeOtras(
        this.plantillas,
        await this.plantillas.listar(),
        cambios.diasAntes,
        id,
      );
    }
    return this.plantillas.actualizar(plantilla.actualizar(cambios));
  }
}

import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { DatosPlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";

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
    return this.plantillas.actualizar(plantilla.actualizar(cambios));
  }
}

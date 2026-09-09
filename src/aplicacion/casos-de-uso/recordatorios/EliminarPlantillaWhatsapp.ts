import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: borrar una plantilla de recordatorio.
 *
 * La predeterminada no se puede borrar: dejaría al envío automático sin con
 * qué mandar, y eso se nota el día en que los pacientes no reciben el aviso.
 * Para reemplazarla hay que marcar otra primero, que es una decisión
 * explícita y reversible.
 */
export class EliminarPlantillaWhatsapp {
  constructor(private readonly plantillas: IPlantillaWhatsappRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaWhatsappNoEncontrada(id);
    }
    if (plantilla.predeterminada) {
      throw new ErrorValidacion(
        "No se puede borrar la plantilla predeterminada. Marcá otra como predeterminada primero.",
      );
    }
    await this.plantillas.eliminar(id);
  }
}

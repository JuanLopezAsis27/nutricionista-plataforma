import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";

/**
 * Deja una sola plantilla predeterminada: la que se está marcando.
 *
 * Lo comparten crear y actualizar porque la regla es la misma y tenerla dos
 * veces era la forma más directa de que un día quedaran dos predeterminadas y
 * el barrido eligiera cualquiera.
 */
export async function desmarcarOtrasPredeterminadas(
  repositorio: IPlantillaWhatsappRepositorio,
  plantillas: PlantillaWhatsapp[],
  idNueva: string | null,
): Promise<void> {
  for (const otra of plantillas) {
    if (otra.predeterminada && otra.id !== idNueva) {
      await repositorio.actualizar(otra.desmarcarPredeterminada());
    }
  }
}

import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IAdministradorPlantillasMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: borrar una plantilla de recordatorio.
 *
 * La predeterminada no se puede borrar: dejaría al envío automático sin con
 * qué mandar, y eso se nota el día en que los pacientes no reciben el aviso.
 * Para reemplazarla hay que marcar otra primero, que es una decisión
 * explícita y reversible.
 *
 * Si la dio de alta la app en Meta, también se borra allá (Meta primero: si
 * falla, la plantilla sigue en los dos lados y se puede reintentar). Una
 * vinculada a mano por su nombre NO se toca en Meta: la creó otra persona,
 * afuera de la app, y puede estar usándose desde otro lado.
 */
export class EliminarPlantillaWhatsapp {
  constructor(
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly administrador: IAdministradorPlantillasMeta,
  ) {}

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
    // Una que Meta ya dio de baja no hay que borrarla allá: no existe.
    if (
      plantilla.idMeta &&
      plantilla.claveMeta &&
      plantilla.estadoMeta !== "DESHABILITADA"
    ) {
      await this.administrador.eliminar(plantilla.claveMeta, plantilla.idMeta);
    }
    await this.plantillas.eliminar(id);
  }
}

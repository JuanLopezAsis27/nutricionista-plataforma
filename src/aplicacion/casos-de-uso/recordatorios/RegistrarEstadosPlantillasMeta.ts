import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { EstadoPlantillaRemota } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";

/** Motivo para una plantilla con nombre de Meta que la cuenta no tiene. */
export const MOTIVO_NO_EXISTE_EN_META =
  "No existe en la cuenta de WhatsApp Business con ese nombre e idioma.";

/**
 * Caso de uso: aplicar a las plantillas el estado de revisión que informó
 * Meta. Lo comparten el webhook (`message_template_status_update`, que avisa
 * de a una) y la consulta manual (`SincronizarPlantillasMeta`, que trae todas).
 *
 * Cada estado se busca por el id de Meta —las dadas de alta desde la app— o,
 * si no, por nombre e idioma —las vinculadas a mano—: a esas también les
 * sirve saber si Meta las pausó.
 *
 * Con `completa` (la lista es TODA la cuenta), una plantilla con nombre de
 * Meta que no aparece queda DESHABILITADA: un envío con ese nombre lo va a
 * rechazar Meta, y es mejor saberlo antes que por un recordatorio fallido.
 * El webhook no es completo y nunca deduce ausencias.
 */
export class RegistrarEstadosPlantillasMeta {
  constructor(private readonly plantillas: IPlantillaWhatsappRepositorio) {}

  async ejecutar(
    remotas: EstadoPlantillaRemota[],
    opciones: { completa?: boolean; ahora?: Date } = {},
  ): Promise<number> {
    const ahora = opciones.ahora ?? new Date();
    let actualizadas = 0;

    for (const plantilla of await this.plantillas.listar()) {
      if (!plantilla.claveMeta) continue;
      const remota = remotas.find((r) => corresponde(plantilla, r));

      let nueva: PlantillaWhatsapp = plantilla;
      if (remota) {
        nueva = plantilla.registrarEstadoMeta(
          remota.estado,
          remota.motivo,
          ahora,
        );
      } else if (opciones.completa) {
        nueva = plantilla.registrarEstadoMeta(
          "DESHABILITADA",
          MOTIVO_NO_EXISTE_EN_META,
          ahora,
        );
      }

      if (nueva !== plantilla) {
        await this.plantillas.actualizar(nueva);
        actualizadas += 1;
      }
    }
    return actualizadas;
  }
}

function corresponde(
  plantilla: PlantillaWhatsapp,
  remota: EstadoPlantillaRemota,
): boolean {
  if (plantilla.idMeta) return plantilla.idMeta === remota.idMeta;
  return (
    plantilla.claveMeta === remota.nombre &&
    plantilla.idiomaMeta === remota.idioma
  );
}

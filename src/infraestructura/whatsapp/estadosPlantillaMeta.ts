import type { EstadoPlantillaMeta } from "@/dominio/entidades/PlantillaWhatsapp";

/**
 * Los estados de Meta plegados a los cinco de la app. Lo usan la consulta a la
 * API y el webhook `message_template_status_update`, que nombran los estados
 * igual.
 *
 * FLAGGED queda como APROBADA: Meta la marca por baja calidad pero la sigue
 * dejando salir, y el motivo se conserva para que el profesional lo vea.
 * REINSTATED es una pausada que volvió.
 */
const ESTADOS: Record<string, EstadoPlantillaMeta> = {
  PENDING: "EN_REVISION",
  IN_APPEAL: "EN_REVISION",
  APPROVED: "APROBADA",
  REINSTATED: "APROBADA",
  FLAGGED: "APROBADA",
  REJECTED: "RECHAZADA",
  PAUSED: "PAUSADA",
  DISABLED: "DESHABILITADA",
  PENDING_DELETION: "DESHABILITADA",
  DELETED: "DESHABILITADA",
  ARCHIVED: "DESHABILITADA",
  LIMIT_EXCEEDED: "DESHABILITADA",
};

/** null si Meta manda un estado que la app no conoce: se ignora. */
export function estadoDesdeMeta(
  estado: string | undefined,
): EstadoPlantillaMeta | null {
  return ESTADOS[(estado ?? "").toUpperCase()] ?? null;
}

/**
 * Los motivos de rechazo más comunes, en castellano y diciendo qué corregir.
 * El que no se conoce pasa tal cual: inventarle una explicación manda a mirar
 * donde no hay nada.
 */
const MOTIVOS: Record<string, string> = {
  INVALID_FORMAT:
    "Formato inválido: revisá las variables (no pueden ir pegadas ni al principio o al final) y los botones.",
  TAG_CONTENT_MISMATCH:
    "El contenido no coincide con la categoría elegida (por ejemplo, un texto promocional como UTILITY).",
  PROMOTIONAL:
    "Meta lo consideró promocional: usá la categoría MARKETING o sacá el tono de promoción.",
  ABUSIVE_CONTENT: "Meta consideró que el contenido infringe sus políticas.",
  SCAM: "Meta lo consideró posible fraude.",
  INCORRECT_CATEGORY: "La categoría no corresponde al contenido.",
};

/** El motivo de Meta para mostrar; null si no hay (Meta manda "NONE"). */
export function motivoDesdeMeta(motivo: string | undefined): string | null {
  const limpio = motivo?.trim();
  if (!limpio || limpio.toUpperCase() === "NONE") return null;
  return MOTIVOS[limpio.toUpperCase()] ?? limpio;
}

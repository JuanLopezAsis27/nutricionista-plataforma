export { renderizarPlantilla } from "../../plantillas/renderizar";

/**
 * Plantilla por defecto del recordatorio por WhatsApp. Usa los mismos
 * placeholders que las plantillas de email ({{paciente}}, {{fecha}}, {{hora}},
 * {{profesional}}) para que el profesional no aprenda dos vocabularios.
 */
export const PLANTILLA_WHATSAPP_POR_DEFECTO =
  "¡Hola {{paciente}}! Te recuerdo tu turno del {{fecha}} a las {{hora}}. " +
  "Si necesitás reprogramarlo, avisame por acá. ¡Nos vemos! {{profesional}}";

/** Largo máximo de la plantilla configurable (más allá el enlace wa.me se vuelve inmanejable). */
export const MAX_LARGO_PLANTILLA_WHATSAPP = 1000;

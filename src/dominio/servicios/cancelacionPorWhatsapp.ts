import { renderizarPlantilla } from "../plantillas/renderizar";

/**
 * El botón «cancelar por WhatsApp» del recordatorio: un enlace wa.me al
 * número de cancelaciones del consultorio con un mensaje ya escrito.
 *
 * Lo comparten el email y el botón de enlace de la plantilla de WhatsApp, y
 * por eso vive acá: los dos tienen que abrir el MISMO chat con el MISMO texto.
 *
 * No cancela nada. El paciente todavía tiene que mandar el mensaje, y el
 * turno lo cancela el profesional al leerlo: es la diferencia con el botón
 * de la app (`/cancelar-turno`), que sí lo cancela.
 */

/** Texto con el que arranca la plantilla que no escribió uno propio. */
export const MENSAJE_CANCELACION_POR_DEFECTO =
  "Hola, soy {{paciente}}. No voy a poder asistir a mi turno del {{fecha}} a las {{hora}}, quiero cancelarlo.";

export const MAX_LARGO_MENSAJE_CANCELACION = 500;

export const PREFIJO_WA_ME = "https://wa.me/";

/**
 * Lo que va DESPUÉS de `https://wa.me/`: el número y el mensaje codificado.
 * Es también el sufijo dinámico del botón de Meta, que se registra como
 * `https://wa.me/{{1}}` para que cambiar de número no obligue a volver a
 * mandar la plantilla a revisión.
 */
export function sufijoCancelacionPorWhatsapp(
  telefonoE164: string,
  mensaje: string | null | undefined,
  variables: Record<string, string>,
): string {
  const texto = renderizarPlantilla(
    mensaje?.trim() || MENSAJE_CANCELACION_POR_DEFECTO,
    variables,
  );
  return `${telefonoE164}?text=${encodeURIComponent(texto)}`;
}

/** El enlace wa.me completo (el que va en el email). */
export function enlaceCancelacionPorWhatsapp(
  telefonoE164: string,
  mensaje: string | null | undefined,
  variables: Record<string, string>,
): string {
  return `${PREFIJO_WA_ME}${sufijoCancelacionPorWhatsapp(telefonoE164, mensaje, variables)}`;
}

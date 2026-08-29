/**
 * Arma el enlace wa.me que abre el chat del paciente con el mensaje ya
 * escrito. Es de ida: WhatsApp no le informa nada de vuelta a la app, por eso
 * el envío se confirma a mano.
 *
 * Lo usa también el cliente, para rearmar el enlace si el profesional edita el
 * texto en la vista previa.
 */
export function construirEnlaceWhatsapp(
  telefonoE164: string,
  texto: string,
): string {
  return `https://wa.me/${telefonoE164}?text=${encodeURIComponent(texto)}`;
}

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida la firma `x-hub-signature-256` con la que Meta firma cada webhook.
 *
 * Es HMAC-SHA256 del cuerpo CRUDO con el app secret: hay que firmar el texto
 * exacto que llegó, no el JSON re-serializado (cualquier diferencia de
 * espacios o de orden de claves invalida la firma).
 *
 * Sin app secret configurado devuelve false: preferimos rechazar el webhook a
 * aceptar cualquiera que golpee la URL, que es pública.
 */
export function firmaValida(
  cuerpoCrudo: string,
  cabecera: string | null,
  appSecret: string | null,
): boolean {
  if (!appSecret || !cabecera?.startsWith("sha256=")) return false;

  const recibida = Buffer.from(cabecera.slice("sha256=".length), "hex");
  const esperada = createHmac("sha256", appSecret).update(cuerpoCrudo, "utf8").digest();

  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

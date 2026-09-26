/**
 * El código de invitación al portal (migración 80), tal como lo ve y lo tipea
 * una persona: ocho caracteres en dos grupos, `K7PM-X3QD`.
 *
 * Se le dicta por teléfono o se copia de un WhatsApp, así que el alfabeto deja
 * afuera lo que se confunde (0/O, 1/I/L) y la entrada se normaliza sin
 * castigar guiones, espacios ni minúsculas. Con 31 símbolos y 8 posiciones son
 * ~8,5 × 10¹¹ combinaciones, que con vencimiento a los 7 días y límite de
 * intentos por IP no se adivinan.
 */

export const ALFABETO_CODIGO_INVITACION = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_CODIGO_INVITACION = 8;
export const DIAS_VIGENCIA_INVITACION = 7;

/** Deja solo los caracteres que cuentan, en mayúsculas: «k7pm x3qd» → «K7PMX3QD». */
export function normalizarCodigoInvitacion(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Para mostrarlo: «K7PMX3QD» → «K7PM-X3QD». */
export function formatearCodigoInvitacion(codigo: string): string {
  const limpio = normalizarCodigoInvitacion(codigo);
  return `${limpio.slice(0, 4)}-${limpio.slice(4)}`;
}

/** ¿Tiene la forma de un código? (ya normalizado) */
export function esCodigoInvitacionBienFormado(codigo: string): boolean {
  if (codigo.length !== LARGO_CODIGO_INVITACION) return false;
  return [...codigo].every((c) => ALFABETO_CODIGO_INVITACION.includes(c));
}

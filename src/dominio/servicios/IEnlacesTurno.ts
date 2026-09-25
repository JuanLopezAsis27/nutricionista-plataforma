/**
 * Qué hace el enlace del recordatorio al abrirse. Cada acción tiene su página
 * pública y su propia firma: un enlace de confirmar no sirve para cancelar
 * aunque se le cambie la ruta a mano.
 */
export type AccionEnlaceTurno = "CONFIRMAR" | "CANCELAR";

/**
 * Enlaces con los que el paciente actúa sobre su turno desde el recordatorio
 * (email o botón de WhatsApp), sin iniciar sesión.
 */
export interface IEnlacesTurno {
  /** URL pública que hace `accion` sobre el turno; deja de servir en `venceEn`. */
  generar(accion: AccionEnlaceTurno, turnoId: string, venceEn: Date): string;
  /**
   * La parte fija de todas las URLs de esa acción: `generar()` es siempre
   * `prefijo()` más un token. El botón de WhatsApp se registra en Meta como
   * `prefijo(){{1}}` y en cada envío se completa solo el token.
   */
  prefijo(accion: AccionEnlaceTurno): string;
}

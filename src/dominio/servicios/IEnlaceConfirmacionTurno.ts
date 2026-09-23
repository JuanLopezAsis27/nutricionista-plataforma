/** Enlace con el que el paciente confirma su turno desde el email, sin iniciar sesión. */
export interface IEnlaceConfirmacionTurno {
  /** URL pública que confirma el turno; deja de servir en `venceEn`. */
  generar(turnoId: string, venceEn: Date): string;
  /**
   * La parte fija de todas las URLs: `generar()` es siempre `prefijo()` más un
   * token. El botón de WhatsApp se registra en Meta como `prefijo(){{1}}` y en
   * cada envío se completa solo el token.
   */
  prefijo(): string;
}

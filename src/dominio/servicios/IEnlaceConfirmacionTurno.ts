/** Enlace con el que el paciente confirma su turno desde el email, sin iniciar sesión. */
export interface IEnlaceConfirmacionTurno {
  /** URL pública que confirma el turno; deja de servir en `venceEn`. */
  generar(turnoId: string, venceEn: Date): string;
}

/** Un código recién generado: el valor para la persona y el hash que se guarda. */
export interface CodigoInvitacionGenerado {
  /** Normalizado (sin guion). Se muestra o se manda una vez y no se persiste. */
  codigo: string;
  hash: string;
}

/**
 * Puerto para generar y hashear códigos de invitación al portal. Como los
 * tokens de recuperación, en la base queda solo el hash: quien lea la tabla no
 * puede canjear una invitación ajena.
 */
export interface IGeneradorCodigoInvitacion {
  generar(): CodigoInvitacionGenerado;
  /** Hash de un código ya normalizado (ver `normalizarCodigoInvitacion`). */
  hashear(codigo: string): string;
}

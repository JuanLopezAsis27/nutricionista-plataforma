/**
 * Pregunta, antes de mandar un email, si su dominio puede recibir correo.
 *
 * Solo sabe del DOMINIO: `ana@gmial.com` se detecta (el dominio no existe),
 * `anaaa@gmail.com` no (el dominio recibe; que la casilla no exista lo dice el
 * servidor de destino más tarde, con un rebote que la app no recibe).
 */
export interface IVerificadorDominioEmail {
  /**
   * `true` si el dominio recibe correo, `false` si seguro que no (no existe,
   * o no tiene dónde entregarlo) y `null` si no se pudo saber —DNS caído,
   * timeout—. Con `null` se manda igual: un problema de red propio no puede
   * convertirse en «el email del paciente no existe».
   */
  recibeCorreo(email: string): Promise<boolean | null>;
}

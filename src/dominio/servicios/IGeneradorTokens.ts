/** Un token recién generado: el valor en claro (va al email) y su hash (se guarda). */
export interface TokenGenerado {
  /** Valor en claro, se envía al usuario y nunca se persiste. */
  token: string;
  /** Hash del token, lo único que se guarda en la base. */
  hash: string;
}

/**
 * Puerto de dominio para generar y hashear tokens opacos (recuperación de
 * contraseña, invitaciones, etc.).
 *
 * El dominio no conoce `node:crypto`: depende de esta interfaz. La
 * implementación concreta vive en infraestructura y se inyecta por constructor.
 */
export interface IGeneradorTokens {
  /** Genera un token aleatorio seguro junto con su hash. */
  generar(): TokenGenerado;

  /** Hashea un token en claro (para buscar su registro por hash). */
  hashear(token: string): string;
}

/**
 * El nombre de usuario de una cuenta (migración 80).
 *
 * Existe para que un paciente SIN email —un niño, una persona mayor— tenga
 * igual su cuenta del portal. Es solo una credencial para entrar: nunca se usa
 * para asociar una ficha a una cuenta (eso es el código de invitación), porque
 * lo escribe el profesional y un usuario ajeno le abriría la ficha a otro.
 *
 * Minúsculas, sin `@` y sin espacios: la falta de arroba es lo que le deja al
 * login saber si le escribieron un email o un usuario. La misma regla vive en
 * un CHECK de la base.
 */

export const LARGO_MINIMO_NOMBRE_USUARIO = 3;
export const LARGO_MAXIMO_NOMBRE_USUARIO = 30;

const PATRON_NOMBRE_USUARIO = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** Forma canónica: sin espacios alrededor y en minúsculas. */
export function normalizarNombreUsuario(valor: string): string {
  return valor.trim().toLowerCase();
}

/** ¿Tiene la forma de un nombre de usuario (ya normalizado)? */
export function esNombreUsuarioValido(valor: string): boolean {
  return PATRON_NOMBRE_USUARIO.test(valor);
}

/** Lo que se le explica a quien escribió uno que no sirve. */
export const REGLA_NOMBRE_USUARIO =
  `Entre ${LARGO_MINIMO_NOMBRE_USUARIO} y ${LARGO_MAXIMO_NOMBRE_USUARIO} caracteres: ` +
  "letras sin acentos, números, punto, guion o guion bajo, empezando por una letra o un número.";

/**
 * ¿Lo que escribieron en el login es un email? Un nombre de usuario no puede
 * tener `@`, así que alcanza con eso.
 */
export function esIdentificadorEmail(identificador: string): boolean {
  return identificador.includes("@");
}

/**
 * Base para sugerir un nombre de usuario: «María José Pérez» → «maria.perez».
 * Primer nombre y primer apellido, sin acentos ni símbolos. Quien la usa le
 * agrega un número si ya está tomada.
 */
export function baseNombreUsuario(nombre: string, apellido: string): string {
  const limpiar = (texto: string): string =>
    (texto.trim().split(/\s+/)[0] ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const partes = [limpiar(nombre), limpiar(apellido)].filter(Boolean);
  const base = partes.join(".").slice(0, LARGO_MAXIMO_NOMBRE_USUARIO - 3);
  return base.length >= LARGO_MINIMO_NOMBRE_USUARIO ? base : `${base}usuario`;
}

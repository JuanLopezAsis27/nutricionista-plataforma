/**
 * Motivos de rechazo del login que viajan del servidor al formulario.
 *
 * Auth.js no deja devolver un mensaje desde `authorize`: o hay usuario o hay
 * `null`, y `null` sale siempre como el mismo `CredentialsSignin`. El canal que
 * sí existe es el `code` de un error propio, que llega al
 * `signIn(..., { redirect: false })` del formulario.
 *
 * **Viven en su propio archivo y no en `auth.ts` por el bundle.** `auth.ts`
 * importa el contenedor, que arrastra Prisma; que un componente de cliente
 * importara de ahí metería la base de datos en el paquete del navegador (ver
 * la regla en AGENTS.md). Acá no hay más que dos strings, así que lo pueden
 * importar las dos puntas.
 *
 * Solo se declaran los motivos que NO revelan si la cuenta existe:
 *
 * - el bloqueo lo dispara también el contador por IP, sin mirar ninguna cuenta;
 * - la baja se informa recién después de verificar la contraseña.
 *
 * La contraseña incorrecta y el email inexistente no tienen código: los dos
 * salen con el mismo mensaje, porque distinguirlos permitiría averiguar qué
 * emails están registrados.
 */

/** Demasiados intentos fallidos: la clave (IP o email) quedó bloqueada. */
export const CODIGO_LOGIN_BLOQUEADO = "demasiados_intentos";

/** La contraseña era correcta, pero la cuenta está dada de baja. */
export const CODIGO_LOGIN_INACTIVA = "cuenta_inactiva";

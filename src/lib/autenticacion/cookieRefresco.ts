/**
 * La cookie de la sesión persistente, definida en UN solo lugar.
 *
 * La tocan tres capas distintas —el middleware (Edge) para saber si hay algo
 * que renovar, el provider de Auth.js para rotarla y el route handler para
 * borrarla— y con el nombre o el `path` escritos a mano en cada una alcanza con
 * que uno quede distinto para que la cookie se escriba en un lugar y se lea en
 * otro. El síntoma sería el peor posible: nadie renueva nunca y el usuario
 * vuelve a la pantalla de login sin ningún error en el log.
 *
 * **Este archivo tiene que seguir siendo compatible con el Edge Runtime**: lo
 * importa `auth.config.ts`, que a su vez importa `proxy.ts`. Nada de
 * `node:crypto`, Prisma ni el contenedor acá dentro — solo el nombre y las
 * opciones.
 */

/**
 * El prefijo `__Host-` es el que impide que un subdominio escriba esta cookie,
 * y el navegador solo lo acepta con `secure`, `path=/` y sin `domain`. En
 * desarrollo (HTTP) esas condiciones no se cumplen, así que ahí va sin prefijo:
 * si no, el navegador descarta la cookie en silencio y la sesión persistente no
 * funciona en local sin que nada lo diga.
 */
const EN_PRODUCCION = process.env.NODE_ENV === "production";

export const NOMBRE_COOKIE_REFRESCO = EN_PRODUCCION
  ? "__Host-sesion.refresco"
  : "sesion.refresco";

/**
 * Opciones de la cookie.
 *
 * - `httpOnly`: el token no lo lee ningún script. Es lo que evita que un XSS se
 *   lleve puesta la sesión persistente de semanas.
 * - `sameSite: "lax"`: no viaja en peticiones de otros sitios, pero SÍ en una
 *   navegación de primer nivel, que es exactamente el caso que hay que cubrir
 *   —alguien que abre la app desde un favorito después de una semana—. Con
 *   `strict` esa primera navegación llegaría sin cookie y mandaría al login,
 *   que es justo lo que se quiere evitar.
 * - `path: "/"`: la renovación ocurre en `/api/autenticacion/...` pero el
 *   middleware la lee en cualquier ruta protegida.
 */
export function opcionesCookieRefresco(expiraEn: Date): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires: Date;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: EN_PRODUCCION,
    path: "/",
    expires: expiraEn,
  };
}

/** Las opciones con las que se BORRA (tienen que coincidir con las de alta). */
export function opcionesBorradoCookieRefresco(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: 0;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: EN_PRODUCCION,
    path: "/",
    maxAge: 0,
  };
}

/** Ruta que canjea la cookie por una sesión nueva. */
export const RUTA_RENOVAR_SESION = "/api/autenticacion/renovar";

/**
 * Id del provider de Auth.js que emite la sesión a partir de la cookie.
 *
 * Es un provider aparte del de credenciales a propósito: comparten el JWT y los
 * callbacks pero no la política. El de credenciales verifica una contraseña y
 * cuenta los intentos fallidos para frenar la fuerza bruta; este no tiene nada
 * que frenar —el token es de 256 bits y no se puede adivinar— y, sobre todo, no
 * puede compartir el contador: una renovación fallida no es un intento de
 * adivinar una contraseña, y sumarla al mismo limitador dejaría a alguien
 * bloqueado por una cookie vieja.
 */
export const ID_PROVEEDOR_REFRESCO = "refresco";

/**
 * Parámetro con el que la renovación sabe a dónde devolver al usuario.
 * Ver `destinoSeguro` en el route handler: nunca se confía en su valor crudo.
 */
export const PARAMETRO_DESTINO = "destino";

/**
 * Marca que el login pone cuando viene RECHAZADO de la renovación.
 *
 * Es el corta-bucles. `/login` también intenta renovar si ve la cookie —para
 * que quien tenga esa página en favoritos tampoco tenga que tipear la
 * contraseña—, y la renovación fallida vuelve a `/login`: sin una marca, los
 * dos se mandarían al otro para siempre. La renovación borra la cookie al
 * fallar, y eso ya bastaría, pero el bucle sería infinito si alguna vez no
 * lograra borrarla, así que la garantía no puede depender de eso.
 */
export const PARAMETRO_SESION_EXPIRADA = "expirada";

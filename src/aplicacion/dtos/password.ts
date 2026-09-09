import { z } from "zod";

/**
 * Política de contraseñas, en un solo lugar.
 *
 * Estaba escrita dos veces y con dos criterios distintos: 8 caracteres al crear
 * la cuenta (superadmin.dto.ts) y 6 al restablecerla (autenticacion.dto.ts).
 * Eso hacía que el flujo de recuperación DEGRADARA la política: alguien con una
 * contraseña de 8 podía terminar con una de 6 usando "olvidé mi contraseña".
 * Una política que se puede rebajar por otra puerta no es una política.
 *
 * ## Los números
 *
 * 8 caracteres de mínimo, que es el piso que NIST SP 800-63B fija como
 * obligatorio. Estuvo en 12 —el valor que la misma guía RECOMIENDA— y se bajó a
 * pedido: con 12, la pantalla de "Mi perfil" rechazaba la contraseña que el
 * paciente ya venía usando en todos lados, y el efecto observable de eso no es
 * gente eligiendo frases largas sino gente que no cambia nunca la contraseña.
 *
 * Es un compromiso consciente, no un descuido: 8 caracteres sin composición
 * exigida es un espacio de búsqueda chico. Lo que lo sostiene es el resto del
 * sistema —bcrypt para el hash, límite de tasa en el login y en el
 * restablecimiento— y no la longitud sola.
 *
 * La recomendación de fondo no cambia: privilegiar la LONGITUD por sobre las
 * reglas de composición. Exigir mayúscula, número y símbolo produce
 * `Password1!` —que los diccionarios de ataque conocen de memoria— mientras
 * que la longitud sí agrega trabajo real al atacante.
 *
 * Por eso no hay requisitos de composición, pero sí un filtro de las
 * contraseñas obvias: las que aparecen primeras en cualquier lista de ataque y
 * las que se arman con el nombre del propio sistema. Es un piso, no un
 * sustituto de contrastar contra una base de filtraciones (ver AUDIT_SEGURIDAD,
 * hallazgo B1, para el paso siguiente).
 *
 * El máximo de 72 no es arbitrario: bcrypt trunca en 72 bytes, así que aceptar
 * más sería mentirle al usuario sobre la fuerza de lo que eligió.
 */

export const LARGO_MINIMO_PASSWORD = 8;
export const LARGO_MAXIMO_PASSWORD = 72;

/**
 * Contraseñas rechazadas de plano.
 *
 * No pretende ser una lista de filtraciones —para eso hace falta consultar un
 * servicio— sino frenar los casos que se ven en la práctica: el usuario que
 * teclea algo obvio para salir del paso, incluida la contraseña de ejemplo de
 * la documentación de este mismo proyecto.
 *
 * Al bajar el mínimo de 12 a 8 hubo que ampliarla: hasta entonces el largo
 * rechazaba solo `password` o `12345678` sin que nadie los nombrara, y esas
 * son justamente las dos primeras de cualquier lista de ataque.
 */
const PROHIBIDAS = new Set([
  // Las que el mínimo de 12 rechazaba sin necesidad de nombrarlas.
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "abc12345",
  "iloveyou",
  "contrasena",
  "contraseña",
  "nutricion",
  "cambiame",
  "cambiar123",
  // Las que ya estaban.
  "contrasena123",
  "contraseña123",
  "password1234",
  "123456789012",
  "administrador",
  "nutricionista",
  "cambiar123456",
  "qwertyuiop12",
]);

/** ¿La contraseña es una de las obvias? Compara sin distinguir mayúsculas. */
function esObvia(valor: string): boolean {
  const normalizada = valor.trim().toLowerCase();
  if (PROHIBIDAS.has(normalizada)) return true;
  // Un solo carácter repetido ("aaaaaaaaaaaa") cumple el largo y no aporta nada.
  return /^(.)\1+$/.test(normalizada);
}

/**
 * Esquema Zod de una contraseña nueva.
 *
 * Se usa en TODOS los puntos donde alguien elige una: alta de cuenta,
 * restablecimiento y alta de paciente. Cualquier flujo nuevo debe importarlo
 * en vez de escribir su propio `z.string().min(...)`.
 */
export const passwordNuevaDto = z
  .string()
  .min(
    LARGO_MINIMO_PASSWORD,
    `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`,
  )
  .max(LARGO_MAXIMO_PASSWORD, "La contraseña es demasiado larga")
  .refine((valor) => !esObvia(valor), {
    message: "Elegí una contraseña menos previsible.",
  });

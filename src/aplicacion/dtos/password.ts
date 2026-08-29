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
 * 12 caracteres de mínimo. La recomendación actual (NIST SP 800-63B) es privilegiar
 * la longitud por sobre las reglas de composición: exigir mayúscula, número y
 * símbolo produce `Password1!` —que los diccionarios de ataque conocen de
 * memoria— mientras que la longitud sí agrega trabajo real al atacante.
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

export const LARGO_MINIMO_PASSWORD = 12;
export const LARGO_MAXIMO_PASSWORD = 72;

/**
 * Contraseñas rechazadas de plano.
 *
 * No pretende ser una lista de filtraciones —para eso hace falta consultar un
 * servicio— sino frenar los casos que se ven en la práctica: el usuario que
 * teclea algo obvio para salir del paso, incluida la contraseña de ejemplo de
 * la documentación de este mismo proyecto.
 */
const PROHIBIDAS = new Set([
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

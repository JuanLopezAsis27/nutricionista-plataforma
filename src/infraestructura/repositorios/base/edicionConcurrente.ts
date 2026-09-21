import { Prisma } from "@prisma/client";
import { ErrorEdicionConcurrente } from "@/dominio/errores/ErrorEdicionConcurrente";

/**
 * Bloqueo optimista sobre `actualizadoEn`.
 *
 * La condición viaja al WHERE del UPDATE y no a un `if` previo. Comparar antes
 * de escribir es otra vez un leer-y-después-escribir: deja una ventana entre
 * la comparación y el INSERT, más chica que la del formulario pero igual de
 * real. El motor es el único punto donde esa ventana no existe — el mismo
 * criterio que el EXCLUDE de los turnos.
 *
 * No hace falta ninguna columna nueva: `actualizadoEn` ya está en 43 tablas y
 * los repositorios la escriben con el valor de la entidad, así que cada
 * guardado la mueve y sirve de testigo de versión.
 */

/** Prisma cuando el UPDATE no encontró ninguna fila que cumpla el WHERE. */
const REGISTRO_NO_ENCONTRADO = "P2025";

/**
 * El WHERE del UPDATE. Sin testigo es el de siempre (por id); con testigo
 * exige además que la fila siga en la versión que el cliente leyó.
 */
export function enVersion(
  id: string,
  esperadoEn: Date | undefined,
): { id: string; actualizadoEn?: Date } {
  return esperadoEn ? { id, actualizadoEn: esperadoEn } : { id };
}

/**
 * Corre la escritura y traduce el "no encontré la fila" al conflicto de
 * edición.
 *
 * Solo traduce cuando HAY testigo: sin él, un P2025 es lo que dice ser —la
 * fila no está— y lo resuelve `traducirErrorPrisma` con su propio mensaje. Con
 * testigo, en cambio, el caso de uso acaba de leer esa fila unos milisegundos
 * antes, así que "no la encontré" significa casi siempre que alguien la movió;
 * el mensaje cubre los dos casos sin afirmar el que no podemos distinguir.
 */
export async function guardandoVersion<T>(
  queCosa: string,
  esperadoEn: Date | undefined,
  escribir: () => Promise<T>,
): Promise<T> {
  try {
    return await escribir();
  } catch (error) {
    if (
      esperadoEn !== undefined &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === REGISTRO_NO_ENCONTRADO
    ) {
      throw new ErrorEdicionConcurrente(queCosa);
    }
    throw error;
  }
}

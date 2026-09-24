import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * El nombre con el que firma un nutricionista (`nutricionistas.nombre`).
 *
 * Es identidad del inquilino y no una preferencia de la configuración: lo
 * usan los recordatorios (`{{profesional}}`), los emails, el membrete del PDF
 * y el chat, y tiene que existir siempre. Lo carga el SUPERADMIN al crear la
 * cuenta y lo cambia el profesional en Configuración.
 */

/** Largo máximo del nombre (es también el de los DTO). */
export const LARGO_MAXIMO_NOMBRE_PROFESIONAL = 200;

/** Devuelve el nombre sin espacios de más, o lanza si queda vacío o largo. */
export function nombreProfesionalValidado(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio) {
    throw new ErrorValidacion("El nombre del profesional es obligatorio.");
  }
  if (limpio.length > LARGO_MAXIMO_NOMBRE_PROFESIONAL) {
    throw new ErrorValidacion(
      `El nombre del profesional admite hasta ${LARGO_MAXIMO_NOMBRE_PROFESIONAL} caracteres.`,
    );
  }
  return limpio;
}

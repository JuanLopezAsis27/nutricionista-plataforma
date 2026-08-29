import { z } from "zod";

/**
 * Validación de los campos de lista que en la UI se escriben como texto libre.
 *
 * Varios formularios piden listas con un `<textarea>`: las etiquetas separadas
 * por coma, los enlaces uno por línea. Al enviar se parten en un array, y el
 * DTO del servidor valida CADA elemento (`z.array(z.string().max(60)).max(30)`).
 *
 * El formulario, en cambio, solo miraba el largo total del textarea. La
 * consecuencia era una divergencia silenciosa: una etiqueta de 80 caracteres o
 * un enlace sin `https://` pasaban la validación de la pantalla y morían en la
 * mutación, con un mensaje que contradecía lo que el formulario acababa de dar
 * por bueno.
 *
 * Acá viven el corte y la regla juntos, para que el esquema valide exactamente
 * la misma lista que después se envía.
 */

/** Etiquetas separadas por coma, sin vacías ni espacios de sobra. */
export function partirEtiquetas(texto: string): string[] {
  return texto
    .split(",")
    .map((etiqueta) => etiqueta.trim())
    .filter(Boolean);
}

/** Enlaces separados por salto de línea o coma. */
export function partirEnlaces(texto: string): string[] {
  return texto
    .split(/[\n,]/)
    .map((enlace) => enlace.trim())
    .filter(Boolean);
}

/** ¿Es una URL absoluta? Es lo que exige `z.string().url()` en los DTOs. */
export function esUrlAbsoluta(valor: string): boolean {
  try {
    new URL(valor);
    return true;
  } catch {
    return false;
  }
}

/**
 * Campo de etiquetas como texto. Refleja `z.array(z.string().max(60)).max(30)`.
 *
 * @param largoTotal tope del textarea completo (varía según el formulario).
 */
export function etiquetasEnTexto(largoTotal = 500) {
  return z
    .string()
    .max(largoTotal)
    .refine(
      (v) => partirEtiquetas(v).every((e) => e.length <= 60),
      "Cada etiqueta puede tener hasta 60 caracteres",
    )
    .refine((v) => partirEtiquetas(v).length <= 30, "Hasta 30 etiquetas");
}

/**
 * Campo de enlaces como texto. Refleja
 * `z.array(z.string().url().max(500)).max(20)`.
 */
export function enlacesEnTexto(largoTotal = 5000) {
  return z
    .string()
    .max(largoTotal)
    .refine(
      (v) => partirEnlaces(v).every(esUrlAbsoluta),
      "Cada enlace debe ser una URL completa, con https://",
    )
    .refine(
      (v) => partirEnlaces(v).every((e) => e.length <= 500),
      "Cada enlace puede tener hasta 500 caracteres",
    )
    .refine((v) => partirEnlaces(v).length <= 20, "Hasta 20 enlaces");
}

/**
 * Número opcional escrito como texto, con techo (y piso opcional).
 *
 * Los formularios guardan los números como string —para poder mostrar el campo
 * vacío— y validaban solo "positivo", mientras los DTOs acotan cada campo:
 * calorías a 100.000, macros a 10.000, horas semanales a 80, peso de categoría
 * a un mínimo de 20 kg. Un dedazo pasaba la pantalla y moría en el servidor.
 */
export function numeroEnRango(
  minimo: number,
  maximo: number,
  mensaje?: string,
) {
  return z.string().refine(
    (v) => {
      if (v === "") return true;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n >= minimo && n <= maximo;
    },
    mensaje ?? `Debe estar entre ${minimo} y ${maximo}`,
  );
}

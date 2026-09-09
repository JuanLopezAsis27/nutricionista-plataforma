import type { TRPCError } from "@trpc/server";
import type { CodigoErrorDominio } from "@/dominio/errores/ErrorDominio";

/**
 * Traducción de los códigos semánticos del dominio a cada transporte.
 *
 * El dominio no sabe de HTTP ni de tRPC: lanza errores con un `codigo`
 * semántico (NO_ENCONTRADO, CONFLICTO, …) y la presentación decide cómo se
 * ve eso en el cable. Esa traducción estaba escrita tres veces —dos copias
 * idénticas para tRPC (en `trpc.ts` y en `errores-trpc.ts`) y una tercera en
 * `errores-http.ts` para los route handlers—, así que agregar un código nuevo
 * obligaba a acordarse de tres archivos.
 *
 * Ahora vive acá, una sola vez por transporte. El tipo `Record<CodigoErrorDominio, …>`
 * hace que agregar un código al dominio ROMPA LA COMPILACIÓN hasta que se
 * decida su traducción en ambos mapas: es el compilador, y no la memoria de
 * quien edita, el que garantiza que no quede ninguno sin cubrir.
 */

/** Código de dominio → código de error de tRPC. */
export const MAPA_CODIGOS_TRPC: Record<CodigoErrorDominio, TRPCError["code"]> =
  {
    VALIDACION: "BAD_REQUEST",
    NO_ENCONTRADO: "NOT_FOUND",
    CONFLICTO: "CONFLICT",
    ACCESO_DENEGADO: "FORBIDDEN",
    NO_AUTENTICADO: "UNAUTHORIZED",
  };

/** Código de dominio → status HTTP (route handlers: subida de archivos, PDF…). */
export const MAPA_ESTADOS_HTTP: Record<CodigoErrorDominio, number> = {
  VALIDACION: 400,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  ACCESO_DENEGADO: 403,
  NO_AUTENTICADO: 401,
};

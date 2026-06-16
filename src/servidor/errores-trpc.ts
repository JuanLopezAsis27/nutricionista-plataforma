import { TRPCError } from "@trpc/server";
import { ErrorDominio, type CodigoErrorDominio } from "@/dominio/errores/ErrorDominio";

/** Mapea los códigos semánticos del dominio a códigos de error de tRPC. */
const MAPA_CODIGOS: Record<CodigoErrorDominio, TRPCError["code"]> = {
  VALIDACION: "BAD_REQUEST",
  NO_ENCONTRADO: "NOT_FOUND",
  CONFLICTO: "CONFLICT",
  ACCESO_DENEGADO: "FORBIDDEN",
  NO_AUTENTICADO: "UNAUTHORIZED",
};

/**
 * Convierte cualquier error en un TRPCError con el código apropiado.
 *
 * - ErrorDominio (ErrorPacienteNoEncontrado, ErrorTurnoConflicto,
 *   ErrorAccesoDenegado, ErrorValidacion, etc.) → código según su `codigo`
 *   semántico (NOT_FOUND, CONFLICT, FORBIDDEN, BAD_REQUEST…).
 * - Si ya es un TRPCError, se reenvía tal cual.
 * - Cualquier otro error → INTERNAL_SERVER_ERROR (no se filtran detalles).
 *
 * Los routers envuelven sus llamadas a los servicios con esta función.
 */
export function aTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }
  if (error instanceof ErrorDominio) {
    return new TRPCError({
      code: MAPA_CODIGOS[error.codigo],
      message: error.message,
      cause: error,
    });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}

import { NextResponse } from "next/server";
import { ErrorDominio, type CodigoErrorDominio } from "@/dominio/errores";

/** Mapa código de dominio → status HTTP (para route handlers, no tRPC). */
const MAPA_ESTADOS: Record<CodigoErrorDominio, number> = {
  VALIDACION: 400,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  ACCESO_DENEGADO: 403,
  NO_AUTENTICADO: 401,
};

/**
 * Convierte cualquier error en una respuesta JSON con el status apropiado.
 * Los errores de dominio exponen su mensaje; el resto se oculta (500).
 */
export function aRespuestaError(error: unknown): NextResponse {
  if (error instanceof ErrorDominio) {
    return NextResponse.json(
      { error: error.message },
      { status: MAPA_ESTADOS[error.codigo] },
    );
  }
  console.error("Error inesperado en route handler:", error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500 },
  );
}

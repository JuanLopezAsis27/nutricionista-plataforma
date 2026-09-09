import { NextResponse } from "next/server";
import { ErrorDominio } from "@/dominio/errores";
import { MAPA_ESTADOS_HTTP } from "./mapaCodigos";

/**
 * Convierte cualquier error en una respuesta JSON con el status apropiado.
 * Los errores de dominio exponen su mensaje; el resto se oculta (500).
 */
export function aRespuestaError(error: unknown): NextResponse {
  if (error instanceof ErrorDominio) {
    return NextResponse.json(
      { error: error.message },
      { status: MAPA_ESTADOS_HTTP[error.codigo] },
    );
  }
  console.error("Error inesperado en route handler:", error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500 },
  );
}

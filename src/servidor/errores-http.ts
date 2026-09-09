import { NextResponse } from "next/server";
import { ErrorDominio } from "@/dominio/errores";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";
import { MAPA_ESTADOS_HTTP } from "./mapaCodigos";

/**
 * Convierte cualquier error en una respuesta JSON con el status apropiado.
 * Los errores de dominio exponen su mensaje; el resto se oculta (500).
 *
 * Los inesperados van al mismo monitor que usa tRPC (`servidor/trpc.ts`), no a
 * un `console.error` suelto: mismo formato corto y legible en los logs, y
 * mismo destino si hay un webhook configurado.
 */
export function aRespuestaError(error: unknown): NextResponse {
  if (error instanceof ErrorDominio) {
    return NextResponse.json(
      { error: error.message },
      { status: MAPA_ESTADOS_HTTP[error.codigo] },
    );
  }
  monitorErrores.capturar(error, { origen: "route-handler" });
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500 },
  );
}

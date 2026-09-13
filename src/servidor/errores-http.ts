import { NextResponse } from "next/server";
import { ErrorDominio } from "@/dominio/errores";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";
import { traducirErrorPrisma } from "@/infraestructura/persistencia/erroresPrisma";
import { MAPA_ESTADOS_HTTP } from "./mapaCodigos";

/**
 * Convierte cualquier error en una respuesta JSON con el status apropiado.
 * Los errores de dominio exponen su mensaje; el resto se oculta (500).
 *
 * Los inesperados van al mismo monitor que usa tRPC (`servidor/trpc.ts`), no a
 * un `console.error` suelto: mismo formato corto y legible en los logs, y
 * mismo destino si hay un webhook configurado.
 *
 * Es el gemelo del middleware de tRPC para los route handlers de `/api/*`, que
 * no pasan por él, y tiene que tratar los errores IGUAL: si acá un choque
 * contra una restricción de la base saliera como "Error interno del servidor"
 * y en tRPC saliera explicado, la misma equivocación del usuario diría cosas
 * distintas según por dónde entró —subir un archivo o guardar un formulario—.
 */
export function aRespuestaError(error: unknown): NextResponse {
  if (error instanceof ErrorDominio) {
    return NextResponse.json(
      { error: error.message },
      { status: MAPA_ESTADOS_HTTP[error.codigo] },
    );
  }

  // Restricción de la base (repetido, FK que no está, fila borrada por otro).
  // Se traduce a algo accionable y se reporta igual: llegar hasta Postgres
  // significa que falta el chequeo explícito en el caso de uso, que es el que
  // puede dar el mensaje bueno. Ver `erroresPrisma.ts`.
  const restriccion = traducirErrorPrisma(error);
  if (restriccion) {
    monitorErrores.capturar(error, { origen: "route-handler" });
    return NextResponse.json(
      { error: restriccion.message },
      { status: MAPA_ESTADOS_HTTP[restriccion.codigo] },
    );
  }

  monitorErrores.capturar(error, { origen: "route-handler" });
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500 },
  );
}

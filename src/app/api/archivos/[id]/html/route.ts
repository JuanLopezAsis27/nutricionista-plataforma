import type { NextResponse } from "next/server";
import { responderDocumentoComoHtml } from "@/servidor/archivoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id]/html — un documento de Word convertido a HTML, para
 * leerlo adentro de la app: es lo que muestra el visor cuando el plan se subió
 * en Word. El navegador no dibuja un .docx ni un .doc, así que por `/ver` lo
 * descargaría en vez de mostrarlo.
 *
 * La autorización es la misma que la de `/ver` y la de `/[id]` (ver
 * `servidor/archivoHttp`).
 */
export function GET(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return responderDocumentoComoHtml(params);
}

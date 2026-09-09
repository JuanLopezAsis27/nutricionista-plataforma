import type { NextResponse } from "next/server";
import { responderArchivo } from "@/servidor/archivoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id]/ver — sirve el archivo EN LÍNEA (`Content-Disposition:
 * inline`): el visor de PDF del plan, las fotos de una receta, la miniatura
 * del recetario.
 *
 * `inline` es todo el punto: con `attachment` —lo que hace la ruta hermana
 * `/api/archivos/[id]`— el navegador ofrece guardar el archivo en vez de
 * mostrarlo, y el visor queda en blanco.
 *
 * La autorización, el servido y las cabeceras de seguridad son comunes a las
 * dos rutas y viven en `servidor/archivoHttp`, que además explica por qué el
 * contenido sale desde la app y no por una URL firmada del bucket.
 */
export function GET(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return responderArchivo(params, "inline");
}

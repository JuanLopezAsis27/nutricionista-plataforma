import { NextResponse } from "next/server";

/**
 * La respuesta de un Excel para descargar. Sin caché: la lista de alimentos
 * es de la sesión y cambia con cada edición.
 */
export function respuestaPlanilla(
  contenido: Uint8Array<ArrayBuffer>,
  nombreArchivo: string,
): NextResponse {
  return new NextResponse(contenido, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

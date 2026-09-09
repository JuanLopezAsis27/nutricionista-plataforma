import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";
import { responderArchivo } from "@/servidor/archivoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id] — DESCARGA el archivo (`Content-Disposition:
 * attachment`), servido desde la app.
 *
 * Hermana de `/api/archivos/[id]/ver`, que sirve el mismo archivo EN LÍNEA.
 * Lo único que las separa es esa cabecera; el porqué de servir los bytes en
 * vez de redirigir a una URL firmada del bucket está en `servidor/archivoHttp`.
 */
export function GET(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return responderArchivo(params, "attachment");
}

/** DELETE /api/archivos/[id] — elimina metadatos + objeto del bucket. */
export function DELETE(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario || usuario.rol !== "NUTRICIONISTA") {
      return NextResponse.json(
        { error: "Acción exclusiva del nutricionista." },
        { status: 403 },
      );
    }

    try {
      const { id } = await params;
      await servicioArchivo().eliminar(id);
      return NextResponse.json({ eliminado: true });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

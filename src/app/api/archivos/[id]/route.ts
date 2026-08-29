import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id] — redirige (302) a una URL firmada de lectura.
 *
 * Autorización: el nutricionista accede a todo; el paciente a lo que subió
 * él mismo y a lo que le fue compartido (la regla vive en el caso de uso
 * PuedeVerArchivoPaciente y se amplía fase a fase).
 */
export function GET(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }

    try {
      const { id } = await params;

      if (usuario.rol !== "NUTRICIONISTA") {
        const permitido = await servicioArchivo().puedeVerPaciente(id, {
          usuarioId: usuario.id,
          pacienteId: usuario.pacienteId,
        });
        if (!permitido) {
          return NextResponse.json(
            { error: "No tenés acceso a este archivo." },
            { status: 403 },
          );
        }
      }

      const { url } = await servicioArchivo().obtenerUrl(id, 60);
      return NextResponse.redirect(url, 302);
    } catch (error) {
      return aRespuestaError(error);
    }
  });
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

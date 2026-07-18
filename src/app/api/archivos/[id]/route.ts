import { NextResponse } from "next/server";
import { auth } from "@/lib/autenticacion/auth";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { aRespuestaError } from "@/servidor/errores-http";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id] — redirige (302) a una URL firmada de lectura.
 *
 * Autorización: el nutricionista accede a todo; el paciente a lo que subió
 * él mismo y a lo que le fue compartido (la regla vive en el caso de uso
 * PuedeVerArchivoPaciente y se amplía fase a fase).
 */
export async function GET(_solicitud: Request, { params }: Parametros): Promise<NextResponse> {
  const sesion = await auth();
  if (!sesion?.user) {
    return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (sesion.user.rol !== "NUTRICIONISTA") {
      const permitido = await servicioArchivo.puedeVerPaciente(id, {
        usuarioId: sesion.user.id,
        pacienteId: sesion.user.pacienteId,
      });
      if (!permitido) {
        return NextResponse.json({ error: "No tenés acceso a este archivo." }, { status: 403 });
      }
    }

    const { url } = await servicioArchivo.obtenerUrl(id, 60);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return aRespuestaError(error);
  }
}

/** DELETE /api/archivos/[id] — elimina metadatos + objeto del bucket. */
export async function DELETE(_solicitud: Request, { params }: Parametros): Promise<NextResponse> {
  const sesion = await auth();
  if (!sesion?.user || sesion.user.rol !== "NUTRICIONISTA") {
    return NextResponse.json({ error: "Acción exclusiva del nutricionista." }, { status: 403 });
  }

  try {
    const { id } = await params;
    await servicioArchivo.eliminar(id);
    return NextResponse.json({ eliminado: true });
  } catch (error) {
    return aRespuestaError(error);
  }
}

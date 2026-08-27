import { NextResponse } from "next/server";
import { auth } from "@/lib/autenticacion/auth";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { subirArchivoDto } from "@/aplicacion/dtos/archivo.dto";
import type { ContextoArchivo } from "@/dominio/entidades/Archivo";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

// La subida de archivos va por route handler (multipart), nunca por tRPC.
export const runtime = "nodejs";

/**
 * POST /api/archivos — sube un archivo (multipart/form-data).
 *
 * Campos: archivo (File), contexto, titulo?, categoria?.
 * Autorización: el nutricionista puede subir en cualquier contexto; el
 * paciente solo fotos de sus comidas ("foto-comida", usado desde la Fase 2).
 */
export function POST(request: Request): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
  const sesion = await auth();
  if (!sesion?.user) {
    return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  }

  try {
    const formulario = await request.formData();
    const archivo = formulario.get("archivo");
    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: "Falta el campo 'archivo' en el formulario." },
        { status: 400 },
      );
    }

    const datos = subirArchivoDto.safeParse({
      nombreOriginal: archivo.name,
      mimeType: archivo.type,
      contexto: formulario.get("contexto"),
      titulo: formulario.get("titulo") ?? null,
      categoria: formulario.get("categoria") ?? null,
      pacienteId: formulario.get("pacienteId") ?? null,
    });
    if (!datos.success) {
      return NextResponse.json(
        { error: "Datos de subida inválidos.", detalles: datos.error.flatten() },
        { status: 400 },
      );
    }

    if (sesion.user.rol !== "NUTRICIONISTA" && datos.data.contexto !== "foto-comida") {
      return NextResponse.json(
        { error: "No tenés permiso para subir archivos en este contexto." },
        { status: 403 },
      );
    }

    const contenido = new Uint8Array(await archivo.arrayBuffer());
    const creado = await servicioArchivo().subir({
      nombreOriginal: datos.data.nombreOriginal,
      mimeType: datos.data.mimeType,
      contenido,
      contexto: datos.data.contexto as ContextoArchivo,
      titulo: datos.data.titulo,
      categoria: datos.data.categoria,
      subidoPorId: sesion.user.id,
      dueno: datos.data.pacienteId ? { pacienteId: datos.data.pacienteId } : undefined,
    });

    return NextResponse.json({ archivo: creado }, { status: 201 });
  } catch (error) {
    return aRespuestaError(error);
  }
  });
}

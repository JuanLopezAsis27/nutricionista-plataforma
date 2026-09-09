import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioArchivo,
  servicioPaciente,
} from "@/infraestructura/contenedor/contenedor";
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
 * paciente solo los suyos (ver CONTEXTOS_DEL_PACIENTE).
 */

/**
 * Los contextos que un usuario NO nutricionista puede subir.
 *
 * Es una lista blanca y no un `!==` suelto a propósito: cada contexto que se
 * abre acá es una decisión de permisos, y la lista obliga a nombrarla.
 *
 *  - `foto-comida`: la foto del plato en su diario (Fase 2).
 *  - `perfil`: su propia foto de perfil. No cuelga de ninguna ficha —la FK vive
 *    en `usuarios.fotoPerfilId`— así que no hay dueño que un paciente pudiera
 *    falsear mandando el id de otro.
 */
const CONTEXTOS_DEL_PACIENTE = new Set<string>(["foto-comida", "perfil"]);
export function POST(request: Request): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
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
          {
            error: "Datos de subida inválidos.",
            detalles: datos.error.flatten(),
          },
          { status: 400 },
        );
      }

      if (
        usuario.rol !== "NUTRICIONISTA" &&
        !CONTEXTOS_DEL_PACIENTE.has(datos.data.contexto)
      ) {
        return NextResponse.json(
          { error: "No tenés permiso para subir archivos en este contexto." },
          { status: 403 },
        );
      }

      // Dueño del archivo.
      //
      // El `pacienteId` venía del formulario y se usaba tal cual. Para el
      // nutricionista está bien —elige a qué ficha adjunta— pero para un paciente
      // era una puerta abierta: mandando el id de OTRO paciente colgaba su subida
      // de una ficha ajena, que después el profesional ve como si fuera de esa
      // persona. Un paciente no elige dueño: el dueño es él, y sale de la sesión.
      //
      // La foto de perfil es la excepción y va SIN dueño: su FK vive del otro
      // lado (`usuarios.fotoPerfilId`, migración 53). Colgarla del paciente la
      // haría aparecer en "Archivos y registros" de su ficha, como si fuera un
      // documento clínico que el profesional tiene que mirar.
      const esFotoDePerfil = datos.data.contexto === "perfil";
      const pacienteDueno = esFotoDePerfil
        ? null
        : usuario.rol === "NUTRICIONISTA"
          ? datos.data.pacienteId
          : usuario.pacienteId;

      // Para el nutricionista, además, el paciente tiene que ser de SU consultorio.
      // El alcance de inquilino ya filtra la lectura, así que si no aparece es que
      // no es suyo; sin esta comprobación la fila quedaba escrita igual, porque la
      // clave foránea de `archivos.pacienteId` apunta al id pelado y no al par
      // (nutricionistaId, id).
      if (usuario.rol === "NUTRICIONISTA" && pacienteDueno) {
        await servicioPaciente().obtenerPacientePorId(pacienteDueno);
      }

      const contenido = new Uint8Array(await archivo.arrayBuffer());
      const creado = await servicioArchivo().subir({
        nombreOriginal: datos.data.nombreOriginal,
        mimeType: datos.data.mimeType,
        contenido,
        contexto: datos.data.contexto as ContextoArchivo,
        titulo: datos.data.titulo,
        categoria: datos.data.categoria,
        subidoPorId: usuario.id,
        dueno: pacienteDueno ? { pacienteId: pacienteDueno } : undefined,
      });

      return NextResponse.json({ archivo: creado }, { status: 201 });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import type { ServicioAlimentosPropios } from "@/aplicacion/servicios/ServicioAlimentosPropios";
import type { RolUsuario } from "@/dominio/entidades/Usuario";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

/**
 * Lo común a las rutas de imagen de un alimento: la de la lista del
 * consultorio (`/api/alimentos/[id]/imagen`) y la del catálogo de la
 * plataforma (`/api/catalogo/alimentos/[id]/imagen`). Cambia el servicio y
 * qué roles pueden ver y cambiar la imagen; el resto es igual.
 *
 * Se sirve desde la app, nunca por URL firmada (docs/ARCHIVOS.md), con las
 * mismas cabeceras de seguridad que un archivo. La caché puede ser larga e
 * inmutable porque la URL lleva la versión de la imagen (`?v=`): una imagen
 * nueva es otra URL.
 */

export interface PermisosImagen {
  ver: RolUsuario[];
  cambiar: RolUsuario[];
}

const CABECERAS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cache-Control": "private, max-age=31536000, immutable",
} as const;

async function conPermiso(
  roles: RolUsuario[],
  accion: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }
    if (!roles.includes(usuario.rol)) {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }
    try {
      return await accion();
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

export function servirImagenAlimento(
  servicio: () => ServicioAlimentosPropios,
  params: Promise<{ id: string }>,
  permisos: PermisosImagen,
): Promise<NextResponse> {
  return conPermiso(permisos.ver, async () => {
    const { id } = await params;
    const imagen = await servicio().obtenerImagen(id);
    return new NextResponse(new Uint8Array(imagen.contenido), {
      headers: { ...CABECERAS, "Content-Type": imagen.mimeType },
    });
  });
}

export function subirImagenAlimento(
  servicio: () => ServicioAlimentosPropios,
  solicitud: Request,
  params: Promise<{ id: string }>,
  permisos: PermisosImagen,
): Promise<NextResponse> {
  return conPermiso(permisos.cambiar, async () => {
    const { id } = await params;
    const formulario = await solicitud.formData();
    const archivo = formulario.get("imagen");
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
    }
    const alimento = await servicio().cambiarImagen(id, {
      contenido: new Uint8Array(await archivo.arrayBuffer()),
      mimeType: archivo.type,
    });
    return NextResponse.json(alimento, { status: 200 });
  });
}

export function quitarImagenAlimento(
  servicio: () => ServicioAlimentosPropios,
  params: Promise<{ id: string }>,
  permisos: PermisosImagen,
): Promise<NextResponse> {
  return conPermiso(permisos.cambiar, async () => {
    const { id } = await params;
    return NextResponse.json(await servicio().quitarImagen(id));
  });
}

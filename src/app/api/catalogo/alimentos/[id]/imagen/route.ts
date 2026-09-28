import type { NextResponse } from "next/server";
import { servicioAlimentosBase } from "@/infraestructura/contenedor/contenedor";
import {
  servirImagenAlimento,
  subirImagenAlimento,
  quitarImagenAlimento,
  type PermisosImagen,
} from "@/servidor/imagenAlimentoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * Imagen de un alimento del catálogo de la PLATAFORMA (migración 84).
 * La ven todos los consultorios (aparece en su buscador); la cambia solo el
 * SUPERADMIN.
 */
const PERMISOS: PermisosImagen = {
  ver: ["NUTRICIONISTA", "SUPERADMIN"],
  cambiar: ["SUPERADMIN"],
};

export function GET(
  _s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return servirImagenAlimento(servicioAlimentosBase, params, PERMISOS);
}

export function POST(
  s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return subirImagenAlimento(servicioAlimentosBase, s, params, PERMISOS);
}

export function DELETE(
  _s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return quitarImagenAlimento(servicioAlimentosBase, params, PERMISOS);
}

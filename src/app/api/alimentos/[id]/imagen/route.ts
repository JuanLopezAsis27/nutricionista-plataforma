import type { NextResponse } from "next/server";
import { servicioAlimentosPropios } from "@/infraestructura/contenedor/contenedor";
import {
  servirImagenAlimento,
  subirImagenAlimento,
  quitarImagenAlimento,
  type PermisosImagen,
} from "@/servidor/imagenAlimentoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * Imagen de un alimento de la lista del CONSULTORIO (migración 84).
 * GET la sirve, POST (multipart, campo `imagen`) la pone o reemplaza, DELETE
 * la quita. Solo NUTRICIONISTA; que el alimento sea de SU consultorio lo
 * garantiza el filtro de inquilino del repositorio (uno ajeno no existe).
 */
const PERMISOS: PermisosImagen = {
  ver: ["NUTRICIONISTA"],
  cambiar: ["NUTRICIONISTA"],
};

export function GET(
  _s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return servirImagenAlimento(servicioAlimentosPropios, params, PERMISOS);
}

export function POST(
  s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return subirImagenAlimento(servicioAlimentosPropios, s, params, PERMISOS);
}

export function DELETE(
  _s: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return quitarImagenAlimento(servicioAlimentosPropios, params, PERMISOS);
}

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/autenticacion/auth";
import { proveedorGoogle } from "@/infraestructura/contenedor/contenedor";

export const runtime = "nodejs";

/**
 * GET /api/integraciones/google/conectar — inicia el flujo OAuth: redirige a la
 * pantalla de consentimiento de Google. Deja un `state` anti-CSRF en una cookie
 * httpOnly que el callback verifica. Solo para el NUTRICIONISTA.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const sesion = await auth();
  const volver = (q: string) => NextResponse.redirect(new URL(`/dashboard/integraciones${q}`, request.url));

  if (sesion?.user?.rol !== "NUTRICIONISTA") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!proveedorGoogle) {
    return volver("?error=no-configurado");
  }

  const estado = randomBytes(16).toString("hex");
  const respuesta = NextResponse.redirect(proveedorGoogle.urlConsentimiento(estado));
  respuesta.cookies.set("g_oauth_state", estado, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return respuesta;
}

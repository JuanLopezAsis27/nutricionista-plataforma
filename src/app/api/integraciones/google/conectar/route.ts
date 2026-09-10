import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  proveedorGoogle,
  urlApp,
} from "@/infraestructura/contenedor/contenedor";

export const runtime = "nodejs";

/**
 * GET /api/integraciones/google/conectar — inicia el flujo OAuth: redirige a la
 * pantalla de consentimiento de Google. Deja un `state` anti-CSRF en una cookie
 * httpOnly que el callback verifica. Solo para el NUTRICIONISTA.
 *
 * Las vueltas se arman con `urlApp()` y NO con `request.url`: ver el comentario
 * del callback.
 */
export async function GET(): Promise<NextResponse> {
  const usuario = await usuarioDeSesion();
  const volver = (q: string) =>
    NextResponse.redirect(new URL(`/dashboard/integraciones${q}`, urlApp()));

  if (usuario?.rol !== "NUTRICIONISTA") {
    return NextResponse.redirect(new URL("/login", urlApp()));
  }
  // Se resuelve una sola vez: el getter es perezoso y TypeScript no puede
  // arrastrar el narrowing de null entre dos invocaciones distintas.
  const google = proveedorGoogle();
  if (!google) {
    return volver("?error=no-configurado");
  }

  const estado = randomBytes(16).toString("hex");
  const respuesta = NextResponse.redirect(google.urlConsentimiento(estado));
  respuesta.cookies.set("g_oauth_state", estado, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return respuesta;
}

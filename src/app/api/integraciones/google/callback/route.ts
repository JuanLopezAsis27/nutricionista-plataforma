import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/autenticacion/auth";
import {
  proveedorGoogle,
  servicioIntegraciones,
} from "@/infraestructura/contenedor/contenedor";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

/**
 * GET /api/integraciones/google/callback — vuelta de Google: valida el `state`
 * anti-CSRF, intercambia el código por tokens y los guarda (cifrados) para el
 * nutricionista de la sesión. Envuelto en `conAlcanceDeSesion` para persistir en
 * su inquilino.
 */
export function GET(request: Request): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const sesion = await auth();
    const volver = (q: string) =>
      NextResponse.redirect(new URL(`/dashboard/integraciones${q}`, request.url));

    if (sesion?.user?.rol !== "NUTRICIONISTA" || !proveedorGoogle) {
      return volver("?error=no-disponible");
    }

    const url = new URL(request.url);
    const codigo = url.searchParams.get("code");
    const estado = url.searchParams.get("state");
    const estadoCookie = (await cookies()).get("g_oauth_state")?.value;

    if (url.searchParams.get("error")) return volver("?error=denegado");
    if (!codigo || !estado || estado !== estadoCookie) return volver("?error=estado");

    try {
      const tokens = await proveedorGoogle.intercambiarCodigo(codigo);
      await servicioIntegraciones.guardarConexionGoogle(tokens);
      const respuesta = volver("?conectado=1");
      respuesta.cookies.delete("g_oauth_state");
      return respuesta;
    } catch (error) {
      console.error("[google] falló el callback OAuth:", error);
      return volver("?error=fallo");
    }
  });
}

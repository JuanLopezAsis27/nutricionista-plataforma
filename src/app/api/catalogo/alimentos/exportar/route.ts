import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioAlimentosBase } from "@/infraestructura/contenedor/contenedor";
import {
  escribirPlanillaAlimentos,
  nombreArchivoPlanilla,
} from "@/infraestructura/nutricion/escribirPlanillaAlimentos";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";
import { respuestaPlanilla } from "@/servidor/respuestaPlanilla";

export const runtime = "nodejs";

/**
 * GET /api/catalogo/alimentos/exportar — descarga en Excel los alimentos
 * PREDETERMINADOS de la plataforma, con las columnas del modelo de
 * importación (se editan y se vuelven a subir). Solo SUPERADMIN.
 *
 * Es el gemelo de /api/alimentos/exportar, que además trae la lista propia
 * del consultorio.
 */
export function GET(): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }
    if (usuario.rol !== "SUPERADMIN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const alimentos = await servicioAlimentosBase().todos();
      const contenido = await escribirPlanillaAlimentos([
        { nombre: "Predeterminados", alimentos },
      ]);
      return respuestaPlanilla(
        contenido,
        nombreArchivoPlanilla("alimentos-predeterminados"),
      );
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioAlimentosBase,
  servicioAlimentosPropios,
} from "@/infraestructura/contenedor/contenedor";
import {
  escribirPlanillaAlimentos,
  nombreArchivoPlanilla,
} from "@/infraestructura/nutricion/escribirPlanillaAlimentos";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";
import { respuestaPlanilla } from "@/servidor/respuestaPlanilla";

export const runtime = "nodejs";

/**
 * GET /api/alimentos/exportar — descarga en Excel TODOS los alimentos que ve
 * el consultorio, separados por pestaña: «Mis alimentos» (los que cargó el
 * profesional) y «Predeterminados» (los de la plataforma). Solo NUTRICIONISTA.
 *
 * Las columnas son las del modelo de importación. La lista propia va PRIMERA
 * porque la importación lee solo la primera pestaña: el archivo editado se
 * vuelve a subir sin copiar el catálogo de la plataforma a la lista propia.
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
    if (usuario.rol !== "NUTRICIONISTA") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const [propios, predeterminados] = await Promise.all([
        servicioAlimentosPropios().todos(),
        servicioAlimentosBase().todos(),
      ]);
      const contenido = await escribirPlanillaAlimentos([
        { nombre: "Mis alimentos", alimentos: propios },
        { nombre: "Predeterminados", alimentos: predeterminados },
      ]);
      return respuestaPlanilla(contenido, nombreArchivoPlanilla("alimentos"));
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

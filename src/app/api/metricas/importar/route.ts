import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioMetricas } from "@/infraestructura/contenedor/contenedor";
import { importarMetricasDto } from "@/aplicacion/dtos/metricas.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

/**
 * POST /api/metricas/importar — la app nativa (Capacitor + HealthKit/Health
 * Connect) sube las métricas diarias del wearable del paciente. JSON simple
 * (`{ dias: [...] }`), pacienteId tomado de la sesión. Ver docs/WEARABLES.md.
 *
 * También existe la mutación tRPC `metricas.importar`; esta ruta es la más
 * cómoda de llamar desde la capa nativa (POST JSON con la cookie de sesión).
 */
export function POST(request: Request): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }
    if (!usuario.pacienteId) {
      return NextResponse.json(
        { error: "Tu usuario no tiene un paciente asociado." },
        { status: 403 },
      );
    }

    try {
      const cuerpo = importarMetricasDto.safeParse(await request.json());
      if (!cuerpo.success) {
        return NextResponse.json(
          { error: "Datos inválidos.", detalles: cuerpo.error.flatten() },
          { status: 400 },
        );
      }
      const importadas = await servicioMetricas().importar(
        usuario.pacienteId,
        cuerpo.data,
      );
      return NextResponse.json({ importadas }, { status: 201 });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

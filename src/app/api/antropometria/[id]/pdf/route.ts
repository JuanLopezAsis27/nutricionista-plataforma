import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioEvaluacion,
  servicioPaciente,
  servicioConfiguracion,
} from "@/infraestructura/contenedor/contenedor";
import { pacienteConsultable } from "@/dominio/servicios/politicaAcceso";
import { ErrorAntropometriaNoEncontrada } from "@/dominio/errores";
import { renderizarMedicionPdf } from "@/infraestructura/pdf/MedicionAntropometricaPdf";
import { formatearFecha } from "@/lib/formato";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/** Nombre de archivo seguro a partir de la fecha de la medición. */
function nombreArchivo(fecha: Date): string {
  return `medicion-${formatearFecha(fecha).replaceAll("/", "-")}.pdf`;
}

/**
 * GET /api/antropometria/[id]/pdf — descarga UNA medición antropométrica
 * como PDF, con la misma planilla que la ficha completa en pantalla.
 *
 * Autorización: `pacienteConsultable` resuelve a qué paciente pertenece la
 * medición — el nutricionista la indica con `?paciente=`, el paciente solo
 * puede pedir la suya (se resuelve de la sesión, nunca del query). La
 * medición se busca DESPUÉS, dentro de la composición de ESE paciente: pedir
 * el id de la medición de otro paciente con un `?paciente=` propio no
 * encuentra nada, porque nunca aparece en su lista.
 */
export function GET(
  solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }

    try {
      const { id } = await params;
      const pacienteIdQuery = new URL(solicitud.url).searchParams.get(
        "paciente",
      );
      const pacienteId = pacienteConsultable(
        usuario,
        pacienteIdQuery,
        "mediciones",
      );

      const composicion =
        await servicioEvaluacion().antropometria.obtenerComposicion(pacienteId);
      const indice = composicion.mediciones.findIndex((m) => m.id === id);
      if (indice === -1) {
        throw new ErrorAntropometriaNoEncontrada(id);
      }
      const medicion = composicion.mediciones[indice]!;
      const anterior = indice > 0 ? composicion.mediciones[indice - 1]! : null;

      const paciente =
        await servicioPaciente().obtenerPacientePorId(pacienteId);
      const config = await servicioConfiguracion().obtener();

      const buffer = await renderizarMedicionPdf({
        medicion,
        anterior,
        nombrePaciente: `${paciente.nombre} ${paciente.apellido}`,
        config,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${nombreArchivo(medicion.fecha)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

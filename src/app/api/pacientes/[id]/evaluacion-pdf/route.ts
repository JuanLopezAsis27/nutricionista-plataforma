import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioEvaluacion,
  servicioPaciente,
  servicioConfiguracion,
} from "@/infraestructura/contenedor/contenedor";
import { renderizarEvaluacionPdf } from "@/infraestructura/pdf/EvaluacionPacientePdf";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/pacientes/[id]/evaluacion-pdf — descarga la evaluación integral
 * del paciente (historia clínica, alertas alimentarias y laboratorios) como
 * PDF.
 *
 * Exclusivo del NUTRICIONISTA: el router de Evaluación ya excluye del portal
 * del paciente todo lo que no sea `miComposicion` (ver `evaluacion.ts`), y
 * esta ruta respeta la misma barrera en vez de abrir una puerta nueva.
 */
export function GET(
  _solicitud: Request,
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
    if (usuario.rol !== "NUTRICIONISTA") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const { id: pacienteId } = await params;

      const [paciente, historiaClinica, alertas, laboratorios, config] =
        await Promise.all([
          servicioPaciente().obtenerPacientePorId(pacienteId),
          servicioEvaluacion().historiaClinica.obtener(pacienteId),
          servicioEvaluacion().alertasAlimentarias.obtener(pacienteId),
          servicioEvaluacion().laboratorios.obtener(pacienteId),
          servicioConfiguracion().obtener(),
        ]);

      const buffer = await renderizarEvaluacionPdf({
        paciente,
        historiaClinica,
        alertas,
        laboratorios,
        config,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="evaluacion-${paciente.apellido.toLowerCase()}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

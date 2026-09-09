import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioEvaluacion,
  servicioPaciente,
  servicioConfiguracion,
} from "@/infraestructura/contenedor/contenedor";
import { renderizarDashboardComposicionPdf } from "@/infraestructura/pdf/DashboardComposicionPdf";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/pacientes/[id]/dashboard-antropometria-pdf — descarga el dashboard
 * de composición corporal (el mismo que la pestaña «Dashboard» de
 * Antropometría) como PDF, con la medición que `?medicion=` indique — o la
 * última, igual que la pantalla al abrirse.
 *
 * Exclusivo del NUTRICIONISTA: es el dashboard técnico (Phantom, somatocarta,
 * índices) que `ComposicionPaciente.tsx` excluye a propósito del portal del
 * paciente. `MedicionAntropometricaPdf` es la pieza que SÍ baja al paciente.
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
    if (usuario.rol !== "NUTRICIONISTA") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const { id: pacienteId } = await params;
      const medicionId = new URL(solicitud.url).searchParams.get("medicion");

      const [paciente, composicion, config] = await Promise.all([
        servicioPaciente().obtenerPacientePorId(pacienteId),
        servicioEvaluacion().antropometria.obtenerComposicion(pacienteId),
        servicioConfiguracion().obtener(),
      ]);

      if (composicion.mediciones.length === 0) {
        return NextResponse.json(
          { error: "El paciente no tiene mediciones cargadas." },
          { status: 404 },
        );
      }

      const indiceSolicitado = medicionId
        ? composicion.mediciones.findIndex((m) => m.id === medicionId)
        : -1;
      const indiceActual =
        indiceSolicitado >= 0
          ? indiceSolicitado
          : composicion.mediciones.length - 1;

      const buffer = await renderizarDashboardComposicionPdf({
        mediciones: composicion.mediciones,
        indiceActual,
        nombrePaciente: `${paciente.nombre} ${paciente.apellido}`,
        config,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="dashboard-composicion-${paciente.apellido.toLowerCase()}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

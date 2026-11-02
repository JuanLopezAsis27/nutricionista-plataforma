import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioConfiguracion,
  servicioPaciente,
  servicioPlanificacionDeportiva,
} from "@/infraestructura/contenedor/contenedor";
import { renderizarPlanificacionPdf } from "@/infraestructura/pdf/PlanificacionDeportivaPdf";
import type {
  CompetenciaDeAsignacionSalidaDto,
  PlanificacionSalidaDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/** Nombre de archivo seguro a partir del nombre de la planificación. */
function nombreArchivo(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca los diacríticos ("ó" → "o")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${base || "planificacion-deportiva"}.pdf`;
}

/**
 * GET /api/planificacion-deportiva/[id]/pdf — la planificación en PDF, con
 * membrete.
 *
 * Autorización, como el PDF del plan: el nutricionista baja cualquiera de su
 * consultorio (con `?paciente=` el PDF lleva el nombre del paciente y la
 * competencia para la que se la asignó); el paciente, solo una que tenga
 * asignada, y sin que se la lea antes de saberlo.
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
      const servicio = servicioPlanificacionDeportiva();
      let planificacion: PlanificacionSalidaDto;
      let competencia: CompetenciaDeAsignacionSalidaDto | null = null;
      let pacienteId: string | null;

      if (usuario.rol === "NUTRICIONISTA") {
        pacienteId = new URL(solicitud.url).searchParams.get("paciente");
        planificacion = await servicio.obtener(id);
        if (pacienteId) {
          const asignada = (await servicio.delPaciente(pacienteId)).find(
            (a) => a.planificacion.id === id,
          );
          competencia = asignada?.competencia ?? null;
        }
      } else {
        // Paciente: solo una que tenga asignada. La lista de las suyas ya es
        // la autorización, como en el portal.
        pacienteId = usuario.pacienteId;
        if (!pacienteId) {
          return NextResponse.json(
            { error: "Tu usuario no tiene un paciente asociado." },
            { status: 403 },
          );
        }
        const asignada = (await servicio.delPaciente(pacienteId)).find(
          (a) => a.planificacion.id === id,
        );
        if (!asignada) {
          return NextResponse.json(
            { error: "No tenés acceso a esta planificación." },
            { status: 403 },
          );
        }
        planificacion = asignada.planificacion;
        competencia = asignada.competencia;
      }

      const [paciente, config] = await Promise.all([
        pacienteId
          ? servicioPaciente().obtenerPacientePorId(pacienteId)
          : Promise.resolve(null),
        servicioConfiguracion().obtener(),
      ]);
      const buffer = await renderizarPlanificacionPdf({
        planificacion,
        nombrePaciente: paciente
          ? `${paciente.nombre} ${paciente.apellido}`
          : null,
        competencia,
        config,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${nombreArchivo(planificacion.nombre)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

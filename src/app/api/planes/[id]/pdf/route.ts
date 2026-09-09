import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioPlan,
  servicioPaciente,
  servicioReceta,
  servicioConfiguracion,
} from "@/infraestructura/contenedor/contenedor";
import { renderizarPlanPdf } from "@/infraestructura/pdf/PlanNutricionalPdf";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/** Nombre de archivo seguro a partir del nombre del plan. */
function nombreArchivo(nombrePlan: string): string {
  const base = nombrePlan
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca los diacríticos ("ó" → "o")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${base || "plan-nutricional"}.pdf`;
}

/**
 * GET /api/planes/[id]/pdf — descarga el plan como PDF con membrete.
 *
 * Autorización: el nutricionista descarga cualquier plan (con `?paciente=` el
 * membrete incluye el nombre del paciente); el paciente solo su plan activo.
 * Los PDF se generan al vuelo, nunca por tRPC (transporte binario).
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
      let nombrePaciente: string | null = null;

      if (usuario.rol === "NUTRICIONISTA") {
        const pacienteId = new URL(solicitud.url).searchParams.get("paciente");
        if (pacienteId) {
          const paciente =
            await servicioPaciente().obtenerPacientePorId(pacienteId);
          nombrePaciente = `${paciente.nombre} ${paciente.apellido}`;
        }
      } else {
        // Paciente: solo puede descargar su propio plan activo.
        if (!usuario.pacienteId) {
          return NextResponse.json(
            { error: "Tu usuario no tiene un paciente asociado." },
            { status: 403 },
          );
        }
        const planActivo = await servicioPlan().obtenerPlanDelPaciente(
          usuario.pacienteId,
        );
        if (!planActivo || planActivo.id !== id) {
          return NextResponse.json(
            { error: "No tenés acceso a este plan." },
            { status: 403 },
          );
        }
        const paciente = await servicioPaciente().obtenerPacientePorId(
          usuario.pacienteId,
        );
        nombrePaciente = `${paciente.nombre} ${paciente.apellido}`;
      }

      const plan = await servicioPlan().obtenerPlanPorId(id);
      const config = await servicioConfiguracion().obtener();

      // Recetas referenciadas por las opciones del plan (únicas, en orden de aparición).
      const recetaIds = [
        ...new Set(
          plan.comidas.flatMap((c) =>
            c.opciones
              .map((o) => o.recetaId)
              .filter((rid): rid is string => Boolean(rid)),
          ),
        ),
      ];
      let recetas: RecetaSalidaDto[] = [];
      if (config.pdfMostrarRecetas && recetaIds.length > 0) {
        const resueltas = await Promise.all(
          recetaIds.map((rid) =>
            servicioReceta()
              .obtenerRecetaPorId(rid)
              .catch(() => null),
          ),
        );
        recetas = resueltas.filter((r): r is RecetaSalidaDto => r !== null);
      }

      const buffer = await renderizarPlanPdf({
        plan,
        nombrePaciente,
        recetas,
        config,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${nombreArchivo(plan.nombre)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

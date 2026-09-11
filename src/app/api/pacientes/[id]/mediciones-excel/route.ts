import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioEvaluacion,
  servicioPaciente,
} from "@/infraestructura/contenedor/contenedor";
import { generarExcelMediciones } from "@/infraestructura/excel/MedicionesExcel";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";
import { nombreSeguro } from "@/servidor/archivoHttp";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/pacientes/[id]/mediciones-excel — todas las mediciones
 * antropométricas del paciente en un Excel, una fila por consulta, con su
 * fecha y los datos del paciente. Es la descarga de la pestaña «Mediciones»
 * de Antropometría.
 *
 * Exclusivo del NUTRICIONISTA, como el resto de las descargas de la ficha.
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
      const [paciente, composicion] = await Promise.all([
        servicioPaciente().obtenerPacientePorId(pacienteId),
        servicioEvaluacion().antropometria.obtenerComposicion(pacienteId),
      ]);

      const contenido = await generarExcelMediciones({
        paciente,
        mediciones: composicion.mediciones,
      });
      const nombre = nombreSeguro(
        `mediciones ${paciente.apellido} ${paciente.nombre}`,
      )
        .replace(/\s+/g, "-")
        .toLowerCase();

      return new NextResponse(contenido, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${nombre}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

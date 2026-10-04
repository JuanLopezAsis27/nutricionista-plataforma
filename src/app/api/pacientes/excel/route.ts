import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioPaciente } from "@/infraestructura/contenedor/contenedor";
import { generarExcelPacientes } from "@/servidor/excelPacientes";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

/**
 * GET /api/pacientes/excel — descarga la lista de pacientes como Excel, con
 * los mismos filtros de búsqueda que la pantalla tiene aplicados. Exporta
 * TODOS los que coinciden, no solo la página visible. Solo NUTRICIONISTA.
 */
export function GET(solicitud: Request): Promise<NextResponse> {
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
      const parametros = new URL(solicitud.url).searchParams;
      const busqueda = parametros.get("busqueda") || undefined;
      const incluirArchivados = parametros.get("incluirArchivados") === "1";

      const { pacientes } = await servicioPaciente().obtenerPacientes({
        pagina: 1,
        porPagina: 10_000,
        busqueda,
        incluirArchivados,
      });

      const buffer = await generarExcelPacientes(pacientes);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="pacientes.xlsx"',
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

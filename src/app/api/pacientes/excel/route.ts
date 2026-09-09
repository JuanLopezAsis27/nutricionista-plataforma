import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioPaciente } from "@/infraestructura/contenedor/contenedor";
import { formatearFecha } from "@/lib/formato";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

const ETIQUETAS_SEXO: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

const COLUMNAS = [
  { header: "Nombre", key: "nombre", width: 20 },
  { header: "Apellido", key: "apellido", width: 20 },
  { header: "Email", key: "email", width: 28 },
  { header: "Teléfono", key: "telefono", width: 18 },
  { header: "Fecha de nacimiento", key: "fechaNacimiento", width: 18 },
  { header: "Sexo", key: "sexo", width: 12 },
  { header: "Estado", key: "estado", width: 14 },
  { header: "Notas", key: "notas", width: 40 },
];

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

      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet("Pacientes");
      hoja.columns = COLUMNAS;
      hoja.getRow(1).font = { bold: true };

      for (const p of pacientes) {
        hoja.addRow({
          nombre: p.nombre,
          apellido: p.apellido,
          email: p.email,
          telefono: p.telefono ?? "",
          fechaNacimiento: formatearFecha(p.fechaNacimiento),
          sexo: p.sexo ? ETIQUETAS_SEXO[p.sexo] : "",
          estado: p.archivadoEn ? "Archivado" : "Activo",
          notas: p.notas ?? "",
        });
      }

      const buffer = await libro.xlsx.writeBuffer();

      return new NextResponse(new Uint8Array(buffer), {
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

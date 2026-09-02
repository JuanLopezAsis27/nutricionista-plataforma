import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioTurno,
  servicioPaciente,
} from "@/infraestructura/contenedor/contenedor";
import { ESTADOS_TURNO, type EstadoTurno } from "@/dominio/entidades/Turno";
import {
  formatearFecha,
  formatearMoneda,
  ETIQUETAS_ESTADO_TURNO,
} from "@/lib/formato";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

const COLUMNAS = [
  { header: "Paciente", key: "paciente", width: 28 },
  { header: "Fecha", key: "fecha", width: 14 },
  { header: "Hora", key: "hora", width: 10 },
  { header: "Duración (min)", key: "duracion", width: 16 },
  { header: "Estado", key: "estado", width: 14 },
  { header: "Precio", key: "precio", width: 14 },
  { header: "Pagado", key: "pagado", width: 10 },
  { header: "Notas", key: "notas", width: 40 },
];

function esEstadoTurno(valor: string | null): valor is EstadoTurno {
  return valor != null && (ESTADOS_TURNO as readonly string[]).includes(valor);
}

/**
 * GET /api/turnos/excel — descarga la lista de turnos como Excel, con los
 * mismos filtros de estado y fecha que la pantalla tiene aplicados. Solo
 * NUTRICIONISTA.
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
      const estadoParam = parametros.get("estado");
      const fechaParam = parametros.get("fecha");

      const [turnos, { pacientes }] = await Promise.all([
        servicioTurno().obtenerTurnos({
          estado: esEstadoTurno(estadoParam) ? estadoParam : undefined,
          fecha: fechaParam ? new Date(fechaParam) : undefined,
        }),
        servicioPaciente().obtenerPacientes({
          pagina: 1,
          porPagina: 10_000,
          incluirArchivados: true,
        }),
      ]);

      const nombrePorId = new Map(
        pacientes.map((p) => [p.id, `${p.nombre} ${p.apellido}`]),
      );

      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet("Turnos");
      hoja.columns = COLUMNAS;
      hoja.getRow(1).font = { bold: true };

      for (const t of turnos) {
        hoja.addRow({
          paciente: nombrePorId.get(t.pacienteId) ?? "—",
          fecha: formatearFecha(t.fecha),
          hora: t.hora,
          duracion: t.duracionMinutos,
          estado: ETIQUETAS_ESTADO_TURNO[t.estado],
          precio: t.precio != null ? formatearMoneda(t.precio) : "",
          pagado: t.precio != null ? (t.pagado ? "Sí" : "No") : "",
          notas: t.notas ?? "",
        });
      }

      const buffer = await libro.xlsx.writeBuffer();

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="turnos.xlsx"',
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

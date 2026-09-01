import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

const COLUMNAS = [
  { header: "Nombre", key: "nombre", width: 30 },
  { header: "Marca", key: "marca", width: 20 },
  { header: "Calorías", key: "calorias", width: 12 },
  { header: "Proteínas", key: "proteinas", width: 12 },
  { header: "Carbohidratos", key: "carbohidratos", width: 14 },
  { header: "Grasas", key: "grasas", width: 12 },
];

/**
 * GET /api/alimentos/plantilla — descarga el modelo de Excel para importar
 * alimentos propios, con las mismas columnas que espera
 * `parsearPlanillaAlimentos`. Solo NUTRICIONISTA.
 */
export function GET(): Promise<NextResponse> {
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
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet("Alimentos");
      hoja.columns = COLUMNAS;
      hoja.getRow(1).font = { bold: true };
      hoja.addRow({
        nombre: "Pechuga de pollo",
        marca: "",
        calorias: 165,
        proteinas: 31,
        carbohidratos: 0,
        grasas: 3.6,
      });

      const buffer = await libro.xlsx.writeBuffer();

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="plantilla-alimentos.xlsx"',
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

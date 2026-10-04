import ExcelJS from "exceljs";
import type { RegistroDiarioSalidaDto } from "@/aplicacion/dtos/diario.dto";

const FORMATO_FECHA = "dd/mm/yyyy";

/**
 * El diario completo de un paciente en un Excel, para el respaldo: una hoja
 * por cosa que se anota (el día, las comidas, la actividad), porque un día
 * tiene varias comidas y varias actividades y en una sola hoja se repetiría
 * todo.
 *
 * Las fotos de las comidas no van adentro del Excel: viajan como archivos al
 * lado, y la columna «Foto» dice cuál es (`rutaFoto`, relativa a la carpeta
 * del paciente).
 */
export async function generarExcelDiario(datos: {
  registros: RegistroDiarioSalidaDto[];
  rutaFoto: (archivoId: string) => string | null;
}): Promise<Uint8Array<ArrayBuffer>> {
  const registros = [...datos.registros].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
  const libro = new ExcelJS.Workbook();

  const dias = hoja(libro, "Días", [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      style: { numFmt: FORMATO_FECHA },
    },
    { header: "Peso (kg)", key: "pesoKg", width: 10 },
    { header: "Agua (ml)", key: "aguaMl", width: 10 },
    { header: "Sueño (h)", key: "horasSueno", width: 10 },
    { header: "Calidad del sueño", key: "calidadSueno", width: 16 },
    { header: "Notas", key: "notas", width: 50 },
  ]);
  const comidas = hoja(libro, "Comidas", [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      style: { numFmt: FORMATO_FECHA },
    },
    { header: "Franja", key: "franja", width: 16 },
    { header: "Hora", key: "hora", width: 8 },
    { header: "Descripción", key: "descripcion", width: 50 },
    { header: "Porción", key: "porcion", width: 16 },
    { header: "Foto", key: "foto", width: 40 },
  ]);
  const actividades = hoja(libro, "Actividad física", [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      style: { numFmt: FORMATO_FECHA },
    },
    { header: "Tipo", key: "tipo", width: 20 },
    { header: "Duración (min)", key: "duracionMinutos", width: 14 },
    { header: "Intensidad", key: "intensidad", width: 12 },
    { header: "Notas", key: "notas", width: 50 },
  ]);

  for (const registro of registros) {
    dias.addRow({
      fecha: registro.fecha,
      pesoKg: registro.pesoKg,
      aguaMl: registro.aguaMl,
      horasSueno: registro.horasSueno,
      calidadSueno: registro.calidadSueno,
      notas: registro.notas,
    });
    for (const comida of registro.comidas) {
      comidas.addRow({
        fecha: registro.fecha,
        franja: comida.franja,
        hora: comida.hora,
        descripcion: comida.descripcion,
        porcion: comida.porcion,
        foto: comida.fotoArchivoId
          ? datos.rutaFoto(comida.fotoArchivoId)
          : null,
      });
    }
    for (const actividad of registro.actividades) {
      actividades.addRow({
        fecha: registro.fecha,
        tipo: actividad.tipo,
        duracionMinutos: actividad.duracionMinutos,
        intensidad: actividad.intensidad,
        notas: actividad.notas,
      });
    }
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function hoja(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Partial<ExcelJS.Column>[],
): ExcelJS.Worksheet {
  const nueva = libro.addWorksheet(nombre);
  nueva.columns = columnas;
  nueva.getRow(1).font = { bold: true };
  return nueva;
}

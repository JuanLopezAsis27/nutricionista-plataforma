import ExcelJS from "exceljs";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import { formatearFecha } from "@/lib/formato";

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
 * La lista de pacientes en un Excel: la descarga del listado y el
 * `Pacientes.xlsx` del respaldo del consultorio son el mismo archivo.
 */
export async function generarExcelPacientes(
  pacientes: PacienteSalidaDto[],
): Promise<Uint8Array<ArrayBuffer>> {
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

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

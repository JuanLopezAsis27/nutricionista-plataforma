import ExcelJS from "exceljs";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import { GRUPOS } from "@/aplicacion/servicios/evaluacion/filasMedicion";
import { ETIQUETAS_PROTOCOLO } from "@/aplicacion/servicios/evaluacion/resumenMedicion";

const ETIQUETAS_SEXO: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

const FORMATO_FECHA = "dd/mm/yyyy";

/** Una columna del Excel: bajo qué grupo va, su título y de dónde sale. */
interface Columna {
  grupo: string;
  titulo: string;
  ancho: number;
  valor: (medicion: MedicionComposicionDto) => ExcelJS.CellValue;
  formato?: string;
}

/**
 * Todas las mediciones antropométricas de un paciente en un Excel: una fila
 * por consulta, con su fecha y los datos del paciente.
 *
 * Las columnas de medidas salen de `GRUPOS`, la misma definición de la
 * planilla que usan la ficha de cada medición y su PDF: una medida que se sume
 * al formulario aparece acá sin tocar este archivo. Y como en la ficha, van
 * solo las que alguna consulta tiene cargadas: la planilla ISAK son decenas de
 * medidas y en consulta se toman unas pocas, así que las columnas vacías de
 * punta a punta solo empujarían fuera de la pantalla las que importan.
 *
 * Los datos del paciente se repiten en cada fila a propósito: así cada fila se
 * entiende sola, y el archivo se puede filtrar, ordenar o juntar con el de
 * otro paciente sin perder de quién es cada medición.
 */
export async function generarExcelMediciones(datos: {
  paciente: Pick<
    PacienteSalidaDto,
    "nombre" | "apellido" | "sexo" | "fechaNacimiento"
  >;
  /** En orden cronológico, como las devuelve la composición. */
  mediciones: MedicionComposicionDto[];
}): Promise<Uint8Array<ArrayBuffer>> {
  const { paciente, mediciones } = datos;

  const columnas: Columna[] = [
    {
      grupo: "Consulta",
      titulo: "Fecha",
      ancho: 12,
      valor: (m) => m.fecha,
      formato: FORMATO_FECHA,
    },
    { grupo: "Consulta", titulo: "Edad", ancho: 7, valor: (m) => m.edadAnios },
    {
      grupo: "Consulta",
      titulo: "Protocolo",
      ancho: 18,
      valor: (m) => ETIQUETAS_PROTOCOLO[m.protocolo],
    },
    {
      grupo: "Paciente",
      titulo: "Apellido",
      ancho: 18,
      valor: () => paciente.apellido,
    },
    {
      grupo: "Paciente",
      titulo: "Nombre",
      ancho: 18,
      valor: () => paciente.nombre,
    },
    {
      grupo: "Paciente",
      titulo: "Sexo",
      ancho: 11,
      valor: () => (paciente.sexo ? ETIQUETAS_SEXO[paciente.sexo] : null),
    },
    {
      grupo: "Paciente",
      titulo: "Fecha de nacimiento",
      ancho: 13,
      valor: () => paciente.fechaNacimiento,
      formato: FORMATO_FECHA,
    },
    ...GRUPOS.flatMap((grupo) =>
      grupo.filas
        .filter((fila) => mediciones.some((m) => fila.valor(m) != null))
        .map((fila) => ({
          grupo: grupo.titulo,
          titulo: fila.etiqueta,
          ancho: 12,
          valor: fila.valor,
        })),
    ),
    {
      grupo: "Notas",
      titulo: "Observaciones",
      ancho: 40,
      valor: (m) => m.observaciones,
    },
  ];

  const libro = new ExcelJS.Workbook();
  // La fecha queda fija al desplazarse: con decenas de columnas de medidas,
  // es lo que dice de qué consulta es cada número.
  const hoja = libro.addWorksheet("Mediciones", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 2 }],
  });

  // Fila 1: el grupo de cada columna. Hace falta porque hay etiquetas que se
  // repiten entre grupos: «Pantorrilla» es un perímetro y también un pliegue.
  const filaGrupos = hoja.getRow(1);
  const filaTitulos = hoja.getRow(2);
  let inicioGrupo = 1;
  columnas.forEach((columna, indice) => {
    const numero = indice + 1;
    hoja.getColumn(numero).width = columna.ancho;
    filaTitulos.getCell(numero).value = columna.titulo;
    if (columnas[indice + 1]?.grupo !== columna.grupo) {
      if (numero > inicioGrupo) hoja.mergeCells(1, inicioGrupo, 1, numero);
      filaGrupos.getCell(inicioGrupo).value = columna.grupo;
      inicioGrupo = numero + 1;
    }
  });
  for (const fila of [filaGrupos, filaTitulos]) {
    fila.font = { bold: true };
    fila.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  }
  filaTitulos.height = 32;

  for (const medicion of mediciones) {
    const fila = hoja.addRow(
      columnas.map((columna) => columna.valor(medicion) ?? null),
    );
    columnas.forEach((columna, indice) => {
      if (columna.formato) fila.getCell(indice + 1).numFmt = columna.formato;
    });
  }

  hoja.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columnas.length },
  };

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

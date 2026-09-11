import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { generarExcelMediciones } from "./MedicionesExcel";

/** Una medición con solo lo que el Excel lee; el resultado, sin calcular. */
function medicion(
  fecha: string,
  medidas: Record<string, number>,
  observaciones: string | null = null,
): MedicionComposicionDto {
  return {
    id: fecha,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    observaciones,
    nivelActividad: null,
    protocolo: "DOS_COMPONENTES",
    metodoGrasa: null,
    edadAnios: 41,
    medidas,
    resultado: {
      indices: {
        imc: null,
        indiceCinturaCadera: null,
        sumatoria6Pliegues: null,
        sumatoria8Pliegues: null,
      },
      fraccionamiento: null,
      somatotipo: null,
      energia: null,
      grasaPorPliegues: { resultados: [] },
      faltantes: [],
    },
  } as unknown as MedicionComposicionDto;
}

const PACIENTE = {
  nombre: "Ana",
  apellido: "Pérez",
  sexo: "FEMENINO" as const,
  fechaNacimiento: new Date("1985-06-01T00:00:00.000Z"),
};

async function leer(contenido: Uint8Array<ArrayBuffer>) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido.buffer);
  const hoja = libro.getWorksheet("Mediciones")!;
  const titulos = (hoja.getRow(2).values as ExcelJS.CellValue[]).slice(1);
  return {
    hoja,
    titulos,
    columna: (titulo: string) => titulos.indexOf(titulo) + 1,
  };
}

describe("generarExcelMediciones", () => {
  it("arma una fila por consulta, con su fecha y los datos del paciente", async () => {
    const { hoja, titulos, columna } = await leer(
      await generarExcelMediciones({
        paciente: PACIENTE,
        mediciones: [
          medicion(
            "2024-03-15",
            { pesoKg: 87.3, pliegueTricipital: 35 },
            "Primera consulta",
          ),
          medicion("2024-04-12", { pesoKg: 84.7, pliegueTricipital: 33 }),
        ],
      }),
    );

    expect(titulos.slice(0, 7)).toEqual([
      "Fecha",
      "Edad",
      "Protocolo",
      "Apellido",
      "Nombre",
      "Sexo",
      "Fecha de nacimiento",
    ]);
    // Dos filas de encabezado y una por consulta.
    expect(hoja.rowCount).toBe(4);

    const primera = hoja.getRow(3);
    expect(primera.getCell(columna("Fecha")).value).toEqual(
      new Date("2024-03-15T00:00:00.000Z"),
    );
    expect(primera.getCell(columna("Apellido")).value).toBe("Pérez");
    expect(primera.getCell(columna("Sexo")).value).toBe("Femenino");
    expect(primera.getCell(columna("Peso (kg)")).value).toBe(87.3);
    expect(primera.getCell(columna("Tricipital")).value).toBe(35);
    expect(primera.getCell(columna("Observaciones")).value).toBe(
      "Primera consulta",
    );
    expect(hoja.getRow(4).getCell(columna("Peso (kg)")).value).toBe(84.7);
  });

  it("deja afuera las medidas que ninguna consulta tiene cargadas", async () => {
    // La planilla ISAK son decenas de medidas y en consulta se toman unas
    // pocas: las columnas vacías de punta a punta solo estorban.
    const { titulos } = await leer(
      await generarExcelMediciones({
        paciente: PACIENTE,
        mediciones: [medicion("2024-03-15", { pesoKg: 80 })],
      }),
    );

    expect(titulos).toContain("Peso (kg)");
    expect(titulos).not.toContain("Pectoral");
    expect(titulos).not.toContain("Cabeza");
  });

  it("pone el grupo arriba para distinguir las etiquetas repetidas", async () => {
    // «Pantorrilla» es un perímetro y también un pliegue.
    const { hoja, titulos } = await leer(
      await generarExcelMediciones({
        paciente: PACIENTE,
        mediciones: [
          medicion("2024-03-15", {
            pesoKg: 80,
            circPantorrilla: 36,
            plieguePantorrilla: 12,
          }),
        ],
      }),
    );

    const columnas = titulos.flatMap((titulo, indice) =>
      titulo === "Pantorrilla" ? [indice + 1] : [],
    );
    expect(columnas).toHaveLength(2);
    expect(columnas.map((c) => hoja.getRow(1).getCell(c).value)).toEqual([
      "Perímetros (cm)",
      "Pliegues cutáneos (mm)",
    ]);
  });
});

import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  escribirPlanillaAlimentos,
  type AlimentoParaPlanilla,
} from "./escribirPlanillaAlimentos";
import { parsearPlanillaAlimentos } from "./parsearPlanillaAlimentos";
import { CATEGORIAS_ALIMENTO } from "@/dominio/entidades/AlimentoPropio";

const LECHE: AlimentoParaPlanilla = {
  nombre: "Leche descremada",
  marca: "La Serenísima",
  caloriasPor100: 35,
  proteinasPor100: 3.4,
  carbohidratosPor100: 5,
  grasasPor100: 0.4,
  categoria: "LACTEOS",
  unidadBase: "MILILITRO",
  medidas: [
    { nombre: "taza", cantidad: 240 },
    { nombre: "cucharada", cantidad: 7.5 },
  ],
};

const SIN_DATOS: AlimentoParaPlanilla = {
  nombre: "Yerba mate",
  marca: null,
  caloriasPor100: null,
  proteinasPor100: null,
  carbohidratosPor100: null,
  grasasPor100: null,
  categoria: null,
  unidadBase: "GRAMO",
  medidas: [],
};

async function idaYVuelta(
  hojas: Parameters<typeof escribirPlanillaAlimentos>[0],
) {
  const contenido = await escribirPlanillaAlimentos(hojas);
  return (
    await parsearPlanillaAlimentos(Buffer.from(contenido), "alimentos.xlsx")
  ).filas;
}

describe("escribirPlanillaAlimentos", () => {
  it("lo que se descarga se vuelve a importar igual", async () => {
    const filas = await idaYVuelta([
      { nombre: "Mis alimentos", alimentos: [LECHE, SIN_DATOS] },
    ]);

    expect(filas).toEqual([
      {
        nombre: "Leche descremada",
        marca: "La Serenísima",
        caloriasPor100: 35,
        proteinasPor100: 3.4,
        carbohidratosPor100: 5,
        grasasPor100: 0.4,
        categoria: "LACTEOS",
        unidadBase: "MILILITRO",
        medidas: [
          { nombre: "taza", cantidad: 240 },
          { nombre: "cucharada", cantidad: 7.5 },
        ],
      },
      {
        // Un macro sin dato vuelve sin dato, no como 0.
        nombre: "Yerba mate",
        marca: null,
        caloriasPor100: null,
        proteinasPor100: null,
        carbohidratosPor100: null,
        grasasPor100: null,
        categoria: null,
        unidadBase: "GRAMO",
        medidas: [],
      },
    ]);
  });

  it("todas las categorías vuelven a leerse como la misma", async () => {
    const filas = await idaYVuelta([
      {
        nombre: "Alimentos",
        alimentos: CATEGORIAS_ALIMENTO.map((categoria) => ({
          ...SIN_DATOS,
          nombre: `Alimento ${categoria}`,
          categoria,
        })),
      },
    ]);
    expect(filas.map((f) => f.categoria)).toEqual([...CATEGORIAS_ALIMENTO]);
  });

  it("la importación lee solo la primera pestaña (la lista propia)", async () => {
    const filas = await idaYVuelta([
      { nombre: "Mis alimentos", alimentos: [SIN_DATOS] },
      { nombre: "Predeterminados", alimentos: [LECHE] },
    ]);
    expect(filas.map((f) => f.nombre)).toEqual(["Yerba mate"]);
  });

  it("separa las listas en pestañas con su nombre", async () => {
    const contenido = await escribirPlanillaAlimentos([
      { nombre: "Mis alimentos", alimentos: [SIN_DATOS] },
      { nombre: "Predeterminados", alimentos: [LECHE, SIN_DATOS] },
    ]);
    const libro = new ExcelJS.Workbook();
    type CargaXlsx = Parameters<typeof libro.xlsx.load>[0];
    await libro.xlsx.load(Buffer.from(contenido) as unknown as CargaXlsx);

    expect(libro.worksheets.map((h) => [h.name, h.rowCount])).toEqual([
      ["Mis alimentos", 2],
      ["Predeterminados", 3],
    ]);
  });
});

describe("escribirPlanillaAlimentos: columna Imagen", () => {
  it("trae la columna «Imagen» vacía, con una nota de cómo cargarla y sus topes", async () => {
    const contenido = await escribirPlanillaAlimentos([
      { nombre: "Alimentos", alimentos: [SIN_DATOS] },
    ]);
    const libro = new ExcelJS.Workbook();
    type CargaXlsx = Parameters<typeof libro.xlsx.load>[0];
    await libro.xlsx.load(Buffer.from(contenido) as unknown as CargaXlsx);
    const hoja = libro.worksheets[0]!;
    const encabezado = hoja.getRow(1).getCell(10);

    expect(encabezado.value).toBe("Imagen");
    // La nota puede quedar como texto o como texto enriquecido: alcanza con
    // que diga el tope.
    expect(JSON.stringify(encabezado.note)).toMatch(/2 MB/);
    expect(hoja.getRow(2).getCell(10).value ?? null).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  escribirPlanillaAlimentos,
  type AlimentoParaPlanilla,
} from "./escribirPlanillaAlimentos";
import { parsearPlanillaAlimentos } from "./parsearPlanillaAlimentos";

/** Nombres de categoría, predeterminadas y propias: la planilla los lleva como texto. */
const CATEGORIAS = [
  "Carnes",
  "Lácteos",
  "Frutos secos y semillas",
  "Geles deportivos",
  "Bebidas isotónicas",
  "Mis snacks",
];

const LECHE: AlimentoParaPlanilla = {
  nombre: "Leche descremada",
  marca: "La Serenísima",
  caloriasPor100: 35,
  proteinasPor100: 3.4,
  carbohidratosPor100: 5,
  grasasPor100: 0.4,
  cafeinaPor100: null,
  descripcion: "Descremada, en sachet",
  categoria: { nombre: "Lácteos" },
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
  // La yerba trae cafeína aunque no traiga macros.
  cafeinaPor100: 1150,
  descripcion: null,
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
        cafeinaPor100: null,
        descripcion: "Descremada, en sachet",
        categoria: "Lácteos",
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
        cafeinaPor100: 1150,
        descripcion: null,
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
        alimentos: CATEGORIAS.map((nombre) => ({
          ...SIN_DATOS,
          nombre: `Alimento ${nombre}`,
          categoria: { nombre },
        })),
      },
    ]);
    expect(filas.map((f) => f.categoria)).toEqual(CATEGORIAS);
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
    // La última columna (L): antes de ella van «Cafeína» y «Descripción».
    const encabezado = hoja.getRow(1).getCell(12);

    expect(encabezado.value).toBe("Imagen");
    // La nota puede quedar como texto o como texto enriquecido: alcanza con
    // que diga el tope.
    expect(JSON.stringify(encabezado.note)).toMatch(/2 MB/);
    expect(hoja.getRow(2).getCell(12).value ?? null).toBeNull();
  });

  it("trae «Cafeína (mg)» con una nota que dice que va por 100, y «Descripción»", async () => {
    const contenido = await escribirPlanillaAlimentos([
      { nombre: "Alimentos", alimentos: [SIN_DATOS] },
    ]);
    const libro = new ExcelJS.Workbook();
    type CargaXlsx = Parameters<typeof libro.xlsx.load>[0];
    await libro.xlsx.load(Buffer.from(contenido) as unknown as CargaXlsx);
    const encabezados = libro.worksheets[0]!.getRow(1);
    const valores = Array.from({ length: 12 }, (_, i) => {
      const valor = encabezados.getCell(i + 1).value;
      return typeof valor === "string" ? valor : null;
    });
    expect(valores).toContain("Cafeína (mg)");
    expect(valores).toContain("Descripción");
    const cafeina = encabezados.getCell(valores.indexOf("Cafeína (mg)") + 1);
    expect(JSON.stringify(cafeina.note)).toMatch(/por 100 g/);
  });
});

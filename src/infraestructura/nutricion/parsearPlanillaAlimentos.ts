import ExcelJS from "exceljs";
import type { FilaAlimentoPropioDto } from "@/aplicacion/dtos/alimentoPropio.dto";

/**
 * Parsea una planilla de alimentos (.xlsx o .csv) a filas `{nombre, marca,
 * macros...}`. Detecta las columnas por el encabezado (flexible con acentos,
 * mayúsculas y sinónimos). Las macros se interpretan POR 100 g. No lanza por
 * filas sueltas inválidas: las omite; sí lanza si no encuentra columna de nombre.
 */
export async function parsearPlanillaAlimentos(
  contenido: Buffer,
  nombreArchivo: string,
): Promise<FilaAlimentoPropioDto[]> {
  const matriz = nombreArchivo.toLowerCase().endsWith(".csv")
    ? parsearCsv(contenido)
    : await parsearXlsx(contenido);

  if (matriz.length === 0) return [];

  const encabezado = matriz[0]!.map(normalizarEncabezado);
  const col = mapearColumnas(encabezado);
  if (col.nombre < 0) {
    throw new Error(
      "No se encontró una columna de nombre. Poné un encabezado como «Nombre» (o Alimento/Insumo).",
    );
  }

  const filas: FilaAlimentoPropioDto[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const celdas = matriz[i]!;
    const nombre = (celdas[col.nombre] ?? "").trim();
    if (nombre === "") continue;
    filas.push({
      nombre,
      marca: col.marca >= 0 ? (celdas[col.marca] ?? "").trim() || null : null,
      caloriasPor100: numero(celdas[col.calorias]),
      proteinasPor100: numero(celdas[col.proteinas]),
      carbohidratosPor100: numero(celdas[col.carbohidratos]),
      grasasPor100: numero(celdas[col.grasas]),
    });
  }
  return filas;
}

interface Columnas {
  nombre: number;
  marca: number;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

function mapearColumnas(encabezado: string[]): Columnas {
  const buscar = (claves: string[]): number =>
    encabezado.findIndex((h) => claves.some((c) => h.includes(c)));
  return {
    nombre: buscar(["nombre", "alimento", "insumo", "producto", "descripcion"]),
    marca: buscar(["marca"]),
    calorias: buscar(["caloria", "kcal", "energia"]),
    proteinas: buscar(["proteina", "prot"]),
    carbohidratos: buscar(["carbohidrato", "carbo", "hidrato", "carbs", "hc"]),
    grasas: buscar(["grasa", "lipido", "fat"]),
  };
}

/** Encabezado sin acentos, en minúsculas y sin espacios de más. */
function normalizarEncabezado(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Convierte a número aceptando coma o punto decimal; null si no es válido. */
function numero(valor: string | undefined): number | null {
  if (valor == null) return null;
  const limpio = valor.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function parsearXlsx(contenido: Buffer): Promise<string[][]> {
  const libro = new ExcelJS.Workbook();
  // exceljs declara un `Buffer` de una versión de tipos distinta a la de @types/node.
  type CargaXlsx = Parameters<typeof libro.xlsx.load>[0];
  await libro.xlsx.load(contenido as unknown as CargaXlsx);
  const hoja = libro.worksheets[0];
  if (!hoja) return [];

  const matriz: string[][] = [];
  hoja.eachRow((fila) => {
    const valores = Array.isArray(fila.values) ? fila.values.slice(1) : [];
    matriz.push(valores.map(valorCelda));
  });
  return matriz;
}

/** Convierte el valor de una celda de exceljs a texto plano. */
function valorCelda(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    if (typeof o.text === "string") return o.text; // hyperlink/richtext
    if ("result" in o) return String(o.result ?? ""); // fórmula
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>).map((r) => r.text ?? "").join("");
    }
    return "";
  }
  return String(valor);
}

function parsearCsv(contenido: Buffer): string[][] {
  const texto = contenido.toString("utf-8").replace(/^﻿/, "");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const delimitador = (lineas[0]!.match(/;/g)?.length ?? 0) > (lineas[0]!.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";
  return lineas.map((linea) => linea.split(delimitador).map((c) => c.trim().replace(/^"|"$/g, "")));
}

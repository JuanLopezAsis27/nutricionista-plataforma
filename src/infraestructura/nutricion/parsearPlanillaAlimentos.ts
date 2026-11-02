import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { FilaAlimentoPropioDto } from "@/aplicacion/dtos/alimentoPropio.dto";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  medidasDesdeTexto,
  unidadBaseDesdeTexto,
} from "@/dominio/entidades/medidasAlimento";
import { leerImagenesEnCelda } from "./imagenesEnCelda";
import { leerImagenesSobreCeldas } from "./imagenesSobreCeldas";
import type { ImagenDeCelda } from "./partesXlsx";

/** Una imagen que venía en la planilla, todavía sin validar. */
export interface ImagenDePlanilla {
  contenido: Uint8Array;
  /** Según la extensión del archivo dentro del xlsx; la firma se verifica después. */
  mimeType: string;
}

/** Lo que se leyó de la planilla. */
export interface PlanillaAlimentos {
  filas: FilaAlimentoPropioDto[];
  /** La imagen de cada fila que traía una, por índice en `filas`. */
  imagenes: Map<number, ImagenDePlanilla>;
}

/** Una fila de la hoja con su número (desde 1), que es lo que ancla una imagen. */
interface FilaDeHoja {
  numero: number;
  celdas: string[];
}

const MIME_DE_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Parsea una planilla de alimentos (.xlsx o .csv) a filas `{nombre, marca,
 * macros...}`. Detecta las columnas por el encabezado (flexible con acentos,
 * mayúsculas y sinónimos). Las macros se interpretan POR 100 g, o por 100 ml si
 * la columna opcional «Unidad» dice ml; la columna opcional «Medidas» trae las
 * medidas caseras («taza = 240; cucharada = 15», migración 90), y las opcionales
 * «Cafeína (mg)» —por 100 g/ml, como los macros— y «Descripción» (migración
 * 95). No lanza por
 * filas sueltas inválidas: las omite; sí lanza si no encuentra columna de nombre.
 *
 * En un xlsx, cada fila puede traer además una IMAGEN: la que esté en esa fila
 * —colocada en la celda o sobre ella, ver `imagenesDeLaHoja`—, preferentemente
 * en la columna «Imagen». Un CSV no puede llevar imágenes.
 */
export async function parsearPlanillaAlimentos(
  contenido: Buffer,
  nombreArchivo: string,
): Promise<PlanillaAlimentos> {
  const esCsv = nombreArchivo.toLowerCase().endsWith(".csv");
  const { matriz, imagenesPorFila } = esCsv
    ? {
        matriz: parsearCsv(contenido),
        imagenesPorFila: new Map<number, ImagenEnFila[]>(),
      }
    : await parsearXlsx(contenido);

  if (matriz.length === 0) return { filas: [], imagenes: new Map() };

  const encabezado = matriz[0]!.celdas.map(normalizarEncabezado);
  const col = mapearColumnas(encabezado);
  if (col.nombre < 0) {
    // Error de DOMINIO y no Error pelado: así el route handler lo distingue de
    // un fallo interno del lector de Excel y puede mostrarlo sin exponer nada.
    throw new ErrorValidacion(
      "No se encontró una columna de nombre. Poné un encabezado como «Nombre» (o Alimento/Insumo).",
    );
  }

  const filas: FilaAlimentoPropioDto[] = [];
  const imagenes = new Map<number, ImagenDePlanilla>();
  for (let i = 1; i < matriz.length; i++) {
    const { numero: numeroFila, celdas } = matriz[i]!;
    const nombre = (celdas[col.nombre] ?? "").trim();
    if (nombre === "") continue;
    const imagen = elegirImagen(imagenesPorFila.get(numeroFila), col.imagen);
    if (imagen) imagenes.set(filas.length, imagen);
    filas.push({
      nombre,
      marca: col.marca >= 0 ? (celdas[col.marca] ?? "").trim() || null : null,
      caloriasPor100: numero(celdas[col.calorias]),
      proteinasPor100: numero(celdas[col.proteinas]),
      carbohidratosPor100: numero(celdas[col.carbohidratos]),
      grasasPor100: numero(celdas[col.grasas]),
      // Opcionales (migración 95). Vacías = la planilla no las trae, y al
      // reemplazar la lista queda lo que ya tenía el alimento.
      cafeinaPor100: col.cafeina >= 0 ? numero(celdas[col.cafeina]) : null,
      descripcion:
        col.descripcion >= 0
          ? (celdas[col.descripcion] ?? "").trim() || null
          : null,
      // Opcional (migración 84): una planilla vieja sin la columna sigue
      // sirviendo. Va el TEXTO: cuál categoría es lo decide el caso de uso
      // contra las de la lista (migración 93), y una que no se reconoce
      // entra sin categoría.
      categoria:
        col.categoria >= 0
          ? (celdas[col.categoria] ?? "").trim() || null
          : null,
      // Opcionales (migración 90), con la misma tolerancia que la categoría:
      // una unidad que no se reconoce queda sin dato (gramos, o la que ya
      // tenía el alimento) y una medida que no se entiende se descarta.
      unidadBase:
        col.unidad >= 0 ? unidadBaseDesdeTexto(celdas[col.unidad]) : null,
      medidas: col.medidas >= 0 ? medidasDesdeTexto(celdas[col.medidas]) : [],
    });
  }
  return { filas, imagenes };
}

/** Una imagen de la hoja, con la columna en la que está (A = 0). */
interface ImagenEnFila extends ImagenDePlanilla {
  columna: number;
}

/**
 * Con varias imágenes en la misma fila, la de la columna «Imagen»; si ninguna
 * está ahí, la de más a la izquierda (alguien la pegó una celda corrida).
 */
function elegirImagen(
  candidatas: ImagenEnFila[] | undefined,
  columnaImagen: number,
): ImagenDePlanilla | null {
  if (!candidatas || candidatas.length === 0) return null;
  const elegida =
    candidatas.find((c) => c.columna === columnaImagen) ??
    [...candidatas].sort((a, b) => a.columna - b.columna)[0]!;
  return { contenido: elegida.contenido, mimeType: elegida.mimeType };
}

interface Columnas {
  nombre: number;
  marca: number;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  cafeina: number;
  descripcion: number;
  categoria: number;
  unidad: number;
  medidas: number;
  imagen: number;
}

function mapearColumnas(encabezado: string[]): Columnas {
  const buscar = (claves: string[]): number =>
    encabezado.findIndex((h) => claves.some((c) => h.includes(c)));
  const unidad = buscar(["unidad"]);
  // «Descripción» fue siempre un sinónimo del NOMBRE (hay planillas que llaman
  // así a la columna del alimento), y desde la migración 95 es además una
  // columna propia. Primero se busca un encabezado de nombre de verdad; solo
  // si no hay ninguno, «Descripción» hace de nombre y no de descripción.
  const nombrePropio = buscar(["nombre", "alimento", "insumo", "producto"]);
  const nombre = nombrePropio >= 0 ? nombrePropio : buscar(["descripcion"]);
  return {
    nombre,
    marca: buscar(["marca"]),
    calorias: buscar(["caloria", "kcal", "energia"]),
    proteinas: buscar(["proteina", "prot"]),
    carbohidratos: buscar(["carbohidrato", "carbo", "hidrato", "carbs", "hc"]),
    grasas: buscar(["grasa", "lipido", "fat"]),
    cafeina: buscar(["cafeina", "cafeína", "caffeine"]),
    descripcion: encabezado.findIndex(
      (h, i) =>
        i !== nombre &&
        ["descripcion", "detalle", "observacion"].some((c) => h.includes(c)),
    ),
    categoria: buscar(["categoria", "rubro", "grupo"]),
    unidad,
    // «Unidad de medida» es la unidad, no las medidas: se excluye esa columna.
    medidas: encabezado.findIndex(
      (h, i) =>
        i !== unidad &&
        ["medida", "porcion", "equivalencia"].some((c) => h.includes(c)),
    ),
    imagen: buscar(["imagen", "foto"]),
  };
}

/** Encabezado sin acentos, en minúsculas y sin espacios de más. */
function normalizarEncabezado(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Convierte a número aceptando coma o punto decimal; null si no es válido. */
function numero(valor: string | undefined): number | null {
  if (valor == null) return null;
  const limpio = valor.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function parsearXlsx(contenido: Buffer): Promise<{
  matriz: FilaDeHoja[];
  imagenesPorFila: Map<number, ImagenEnFila[]>;
}> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(
    await soloLasCeldas(contenido),
    // Los nodos de la hoja que exceljs resuelve por sus relaciones, que
    // `soloLasCeldas` no le pasa: sin esto se caería buscándolas.
    { ignoreNodes: ["hyperlinks", "drawing", "tableParts"] },
  );
  const hoja = libro.worksheets[0];
  if (!hoja) return { matriz: [], imagenesPorFila: new Map() };

  // El número de fila viaja con la fila: `eachRow` se saltea las vacías, así
  // que la posición en la matriz no dice en qué fila de Excel está.
  const matriz: FilaDeHoja[] = [];
  hoja.eachRow((fila, numero) => {
    const valores = Array.isArray(fila.values) ? fila.values.slice(1) : [];
    matriz.push({ numero, celdas: valores.map(valorCelda) });
  });
  return {
    matriz,
    imagenesPorFila: await imagenesDeLaHoja(contenido),
  };
}

/** Lo que recibe `xlsx.load`: exceljs declara un `Buffer` de otra versión de los tipos de Node. */
type CargaXlsx = Parameters<ExcelJS.Xlsx["load"]>[0];

/**
 * Las partes del xlsx que exceljs necesita para leer las CELDAS: el libro,
 * sus hojas, los textos compartidos y los estilos (por los estilos sabe qué
 * número es una fecha). No le llegan los dibujos, los medios, las notas, las
 * tablas ni las relaciones de cada hoja, que es por donde exceljs llega a
 * todo eso.
 *
 * exceljs espera esas partes tal como las guarda Excel —en su ruta y con
 * sus prefijos— y, si el archivo las guarda de otra manera, no se saltea la
 * parte: falla al abrir el archivo entero. Es lo que pasa con las planillas
 * armadas con openpyxl (Python), que guarda las notas en
 * `xl/comments/comment1.xml` y no en `xl/comments1.xml`, apunta a las tablas
 * con rutas absolutas y escribe el dibujo sin el prefijo `xdr:`. Las tres
 * cosas son XML válido, y cada una daba un `TypeError` («reading
 * 'comments'», «'name'», «'anchors'»).
 *
 * Las imágenes no se pierden: `imagenesDeLaHoja` las lee del archivo
 * original.
 */
async function soloLasCeldas(contenido: Buffer): Promise<CargaXlsx> {
  const zip = await JSZip.loadAsync(contenido);
  for (const [nombre, entrada] of Object.entries(zip.files)) {
    // Una carpeta no: `remove` de una carpeta borra también lo que tiene
    // adentro, y `xl/` tiene las hojas.
    if (entrada.dir) continue;
    if (!PARTES_DE_LAS_CELDAS.test(nombre.replace(/^\//, ""))) {
      zip.remove(nombre);
    }
  }
  // DEFLATE, como viene de Excel: lo que no cambió se copia ya comprimido,
  // sin descomprimirlo y volverlo a comprimir.
  const celdas: unknown = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return celdas as CargaXlsx;
}

/** Ver `soloLasCeldas`. Las hojas sí, pero no sus `_rels`. */
const PARTES_DE_LAS_CELDAS =
  /^(?:\[Content_Types\]\.xml|_rels\/\.rels|docProps\/[^/]+|xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+))$/;

/**
 * Las imágenes de la primera hoja, por número de fila. Excel tiene dos
 * maneras de poner una imagen en una celda y se leen las dos del zip:
 *
 * - SOBRE las celdas (un dibujo flotante): `leerImagenesSobreCeldas`, y la
 *   fila es la de su esquina superior izquierda.
 * - EN la celda (Excel 365, «Colocar en celda»): `leerImagenesEnCelda`.
 *
 * Un problema leyendo las imágenes no tumba la planilla: se importan los
 * datos y las filas quedan sin imagen.
 */
async function imagenesDeLaHoja(
  contenido: Buffer,
): Promise<Map<number, ImagenEnFila[]>> {
  const porFila = new Map<number, ImagenEnFila[]>();
  // Ya lo abrió `soloLasCeldas`: es el mismo archivo.
  const zip = await JSZip.loadAsync(contenido);
  for (const leer of [leerImagenesSobreCeldas, leerImagenesEnCelda]) {
    let imagenes: ImagenDeCelda[] = [];
    try {
      imagenes = await leer(zip);
    } catch {
      // Las imágenes son opcionales y los datos ya están leídos.
    }
    for (const imagen of imagenes) {
      const lista = porFila.get(imagen.fila) ?? [];
      lista.push({
        columna: imagen.columna,
        contenido: imagen.contenido,
        mimeType:
          MIME_DE_EXTENSION[imagen.extension] ?? "application/octet-stream",
      });
      porFila.set(imagen.fila, lista);
    }
  }
  return porFila;
}

/** Convierte el valor de una celda de exceljs a texto plano. */
function valorCelda(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    if (typeof o.text === "string") return o.text; // hyperlink/richtext
    // Fórmula. Su `result` puede ser un objeto de error ({ error: "#REF!" }),
    // y ahí "[object Object]" entraría como el NOMBRE de un alimento.
    if ("result" in o) return primitivoATexto(o.result);
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>)
        .map((r) => r.text ?? "")
        .join("");
    }
    return "";
  }
  return primitivoATexto(valor);
}

/** Texto de un primitivo; vacío para todo lo demás (incluidos los objetos). */
function primitivoATexto(valor: unknown): string {
  switch (typeof valor) {
    case "string":
      return valor;
    case "number":
    case "bigint":
    case "boolean":
      return valor.toString();
    default:
      // Incluye el objeto de error de una fórmula rota ({ error: "#REF!" }):
      // mejor una celda vacía, que la fila descarta, que un alimento llamado
      // "[object Object]".
      return "";
  }
}

function parsearCsv(contenido: Buffer): FilaDeHoja[] {
  // El BOM (U+FEFF): Excel lo antepone al exportar CSV en UTF-8 y, sin quitarlo,
  // el primer encabezado nunca coincide. Va como escape y no como carácter
  // literal para que se vea en el diff y no lo borre un editor por accidente.
  const texto = contenido.toString("utf-8").replace(/^\uFEFF/, "");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const delimitador =
    (lineas[0]!.match(/;/g)?.length ?? 0) >
    (lineas[0]!.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  return lineas.map((linea, indice) => ({
    numero: indice + 1,
    celdas: linea.split(delimitador).map((c) => c.trim().replace(/^"|"$/g, "")),
  }));
}

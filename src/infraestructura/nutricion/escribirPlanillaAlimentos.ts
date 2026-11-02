import ExcelJS from "exceljs";
import {
  LADO_MAXIMO_IMAGEN_ALIMENTO,
  TAMANO_MAXIMO_IMAGEN_ALIMENTO,
} from "@/dominio/entidades/AlimentoPropio";
import {
  medidasATexto,
  SIMBOLO_UNIDAD_BASE,
  type MedidaAlimento,
  type UnidadBaseAlimento,
} from "@/dominio/entidades/medidasAlimento";
import { ZONA_HORARIA } from "@/infraestructura/zonaHoraria";

/**
 * Lo que se escribe de un alimento: exactamente lo que vuelve a leer
 * `parsearPlanillaAlimentos`. La columna «Imagen» sale VACÍA: es para cargar
 * una imagen nueva, y vacía quiere decir «conservar la que ya tiene» (meter
 * en la descarga la imagen de cada alimento la haría pesar megas sin que la
 * reimportación lo necesite).
 */
export interface AlimentoParaPlanilla {
  nombre: string;
  marca: string | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  /** mg por 100 g/ml (migración 95). */
  cafeinaPor100: number | null;
  descripcion: string | null;
  /** Se escribe su NOMBRE: es lo que la importación vuelve a reconocer. */
  categoria: { nombre: string } | null;
  unidadBase: UnidadBaseAlimento;
  medidas: ReadonlyArray<MedidaAlimento>;
}

/** Una pestaña del libro. */
export interface HojaDeAlimentos {
  /** Hasta 31 caracteres, sin `\ / ? * [ ] :` (regla de Excel). */
  nombre: string;
  alimentos: ReadonlyArray<AlimentoParaPlanilla>;
}

/**
 * Las columnas del modelo y de la descarga. Los encabezados son los que
 * reconoce el lector: cambiar uno acá sin tocar `mapearColumnas` deja una
 * planilla descargada que ya no se puede volver a subir.
 */
const COLUMNAS: Partial<ExcelJS.Column>[] = [
  { header: "Nombre", key: "nombre", width: 30 },
  { header: "Marca", key: "marca", width: 20 },
  { header: "Calorías", key: "calorias", width: 12 },
  { header: "Proteínas", key: "proteinas", width: 12 },
  { header: "Carbohidratos", key: "carbohidratos", width: 14 },
  { header: "Grasas", key: "grasas", width: 12 },
  // Opcional (migración 95): mg por 100 g/ml, como los macros.
  { header: "Cafeína (mg)", key: "cafeina", width: 13 },
  // Opcional: el nombre de una categoría predeterminada o propia (Carnes,
  // Lácteos, Geles deportivos…). La importación la busca por ese nombre.
  { header: "Categoría", key: "categoria", width: 22 },
  // Opcionales (migración 90): «g» o «ml» (los macros son por 100 de esa
  // unidad; vacío = g) y las medidas caseras, separadas por «;».
  { header: "Unidad", key: "unidad", width: 10 },
  { header: "Medidas", key: "medidas", width: 40 },
  // Opcional (migración 95): texto libre.
  { header: "Descripción", key: "descripcion", width: 45 },
  // Opcional: la imagen se inserta EN la celda (o sobre ella), no se escribe.
  { header: "Imagen", key: "imagen", width: 14 },
];

/** La columna «Imagen» (base 1, como las numera exceljs). */
const COLUMNA_IMAGEN = COLUMNAS.findIndex((c) => c.key === "imagen") + 1;

/** La columna «Cafeína (mg)» (base 1). */
const COLUMNA_CAFEINA = COLUMNAS.findIndex((c) => c.key === "cafeina") + 1;

/** La nota del encabezado «Cafeína»: que va por 100, como los macros. */
const NOTA_CAFEINA =
  "Opcional. Miligramos de cafeína por 100 g (o por 100 ml si la Unidad es " +
  "ml), igual que los macros. Un gel de 40 g con 40 mg de cafeína: 100. " +
  "Vacía: sin dato (al reemplazar la lista, conserva la que ya tenía).";

/** La nota del encabezado «Imagen»: cómo se carga y qué se acepta. */
const NOTA_IMAGEN =
  "Opcional. Insertá la imagen del alimento en esta celda: Insertar › " +
  "Imágenes › Colocar en celda (o sobre la celda, dentro de su fila). " +
  `JPG, PNG o WebP de hasta ${TAMANO_MAXIMO_IMAGEN_ALIMENTO / 1024 / 1024} MB; ` +
  `se guarda reducida a ${LADO_MAXIMO_IMAGEN_ALIMENTO} px. Vacía: el alimento ` +
  "conserva la imagen que ya tenía. En un CSV no se pueden cargar imágenes.";

/**
 * Arma un Excel de alimentos, una pestaña por hoja, con las columnas que
 * espera la importación. Es el gemelo de `parsearPlanillaAlimentos`: lo que
 * se descarga se edita y se vuelve a subir tal cual. Lo usan el modelo vacío
 * (con ejemplos) y la descarga de las listas.
 *
 * La importación lee SOLO la primera pestaña: en la descarga del consultorio
 * esa es la lista propia, y los predeterminados van en la segunda, para que
 * subir de nuevo el archivo no copie el catálogo entero a la lista propia.
 */
export async function escribirPlanillaAlimentos(
  hojas: ReadonlyArray<HojaDeAlimentos>,
): Promise<Uint8Array<ArrayBuffer>> {
  const libro = new ExcelJS.Workbook();
  for (const { nombre, alimentos } of hojas) {
    const hoja = libro.addWorksheet(nombre, {
      // El encabezado queda fijo al bajar por una lista de cientos.
      views: [{ state: "frozen", ySplit: 1 }],
    });
    hoja.columns = COLUMNAS;
    hoja.getRow(1).font = { bold: true };
    hoja.getRow(1).getCell(COLUMNA_IMAGEN).note = NOTA_IMAGEN;
    hoja.getRow(1).getCell(COLUMNA_CAFEINA).note = NOTA_CAFEINA;
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNAS.length },
    };
    for (const a of alimentos) hoja.addRow(aFila(a));
  }
  return new Uint8Array(await libro.xlsx.writeBuffer());
}

/** «alimentos-2026-10-21.xlsx», con la fecha del consultorio y no la UTC. */
export function nombreArchivoPlanilla(prefijo: string): string {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
  }).format(new Date());
  return `${prefijo}-${hoy}.xlsx`;
}

function aFila(a: AlimentoParaPlanilla): Record<string, string | number> {
  return {
    nombre: a.nombre,
    marca: a.marca ?? "",
    // Un macro sin dato queda en blanco, no en 0: al volver a subirlo tiene
    // que seguir siendo «sin dato».
    calorias: a.caloriasPor100 ?? "",
    proteinas: a.proteinasPor100 ?? "",
    carbohidratos: a.carbohidratosPor100 ?? "",
    grasas: a.grasasPor100 ?? "",
    cafeina: a.cafeinaPor100 ?? "",
    descripcion: a.descripcion ?? "",
    categoria: a.categoria?.nombre ?? "",
    unidad: SIMBOLO_UNIDAD_BASE[a.unidadBase],
    medidas: medidasATexto(a.medidas, a.unidadBase),
  };
}

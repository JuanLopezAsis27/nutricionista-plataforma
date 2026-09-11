import mammoth from "mammoth";
import * as XLSX from "xlsx";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { BloqueUsuario } from "./IProveedorLLM";

/**
 * Convierte un archivo del bucket en el bloque que se le manda al LLM.
 *
 * Existe para que las lecturas de documentos clínicos —la historia clínica de
 * un paciente ya existente, la ficha con la que se da de alta uno nuevo y la
 * planilla de evolución de la que se importan mediciones— acepten exactamente
 * los mismos formatos. Estaban separadas y el Word solo andaba en una.
 *
 * Los cuatro caminos son distintos a propósito:
 *
 * - **Imagen** y **PDF** viajan tal cual: el modelo los mira, y en un PDF eso
 *   incluye la maquetación (una ficha clínica suele ser una tabla, y el texto
 *   plano de una tabla pierde qué valor va con qué etiqueta).
 * - **Word** no lo lee ningún modelo. Se extrae el texto acá con `mammoth` y se
 *   manda como texto. El `.doc` viejo (binario, anterior a 2007) NO es un
 *   `.docx` renombrado y no se puede leer: se rechaza con un mensaje que dice
 *   qué hacer, en vez de mandar bytes ilegibles y recibir campos inventados.
 * - **Excel** tampoco lo lee ningún modelo, y encima el texto plano no le
 *   alcanza: en una planilla de evolución el dato está en la POSICIÓN (una
 *   columna por fecha, una fila por medida), así que se serializa como una
 *   grilla con la referencia de cada celda (`B5: 87.3`) y no como una lista de
 *   valores sueltos. A diferencia del Word, el `.xls` anterior a 2007 SÍ se
 *   lee: las proformas de antropometría que circulan entre profesionales
 *   siguen en ese formato, y SheetJS abre los dos.
 */

const MIMES_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
const MIME_PDF = "application/pdf";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC_LEGADO = "application/msword";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIME_XLS = "application/vnd.ms-excel";
const MIMES_PLANILLA: readonly string[] = [MIME_XLSX, MIME_XLS];

/** MIME types que `leerDocumentoParaLLM` sabe convertir. */
export const MIMES_INTERPRETABLES = [
  ...MIMES_IMAGEN,
  MIME_PDF,
  MIME_DOCX,
  MIME_XLSX,
  MIME_XLS,
] as const;

/**
 * Tope de celdas con contenido que se serializan de un libro.
 *
 * Una planilla de evolución real son decenas de celdas; el tope está para que
 * un libro con una hoja de miles de filas pegadas no arme un prompt que no
 * entre en la ventana del modelo. Lo que pase de acá se corta AVISÁNDOLE al
 * modelo, que es mejor que cortar en silencio y que interprete media planilla
 * creyendo que la vio entera.
 */
const MAX_CELDAS = 4000;

/**
 * Hoja de la proforma de antropometría donde se cargan las medidas crudas de
 * una toma (ver `primerCuadroDatosBrutos`).
 */
const HOJA_DATOS_BRUTOS = "proc datos brutos";

export class ErrorDocumentoNoInterpretable extends Error {}

export async function leerDocumentoParaLLM(
  almacenamiento: IAlmacenamientoArchivos,
  archivo: { clave: string; mimeType: string },
): Promise<BloqueUsuario> {
  if (archivo.mimeType === MIME_DOC_LEGADO) {
    throw new ErrorDocumentoNoInterpretable(
      "El formato .doc (Word anterior a 2007) no se puede leer. Guardá el documento como .docx o PDF y volvé a subirlo.",
    );
  }

  const esImagen = (MIMES_IMAGEN as readonly string[]).includes(
    archivo.mimeType,
  );
  const esPlanilla = MIMES_PLANILLA.includes(archivo.mimeType);
  if (
    !esImagen &&
    !esPlanilla &&
    archivo.mimeType !== MIME_PDF &&
    archivo.mimeType !== MIME_DOCX
  ) {
    throw new ErrorDocumentoNoInterpretable(
      "Solo se puede autocompletar desde una foto (JPG, PNG, WEBP), un PDF, un Word (.docx) o un Excel (.xlsx o .xls).",
    );
  }

  const contenido = await almacenamiento.descargar(archivo.clave);
  const buffer = Buffer.from(contenido);

  if (archivo.mimeType === MIME_DOCX) {
    const { value } = await mammoth.extractRawText({ buffer });
    const texto = value.trim();
    if (!texto) {
      throw new ErrorDocumentoNoInterpretable(
        "El documento Word no tiene texto legible (puede ser una imagen escaneada pegada adentro). Subilo como PDF o foto.",
      );
    }
    return { tipo: "texto", texto };
  }

  if (esPlanilla) {
    return { tipo: "texto", texto: planillaATexto(contenido) };
  }

  const base64 = buffer.toString("base64");
  return archivo.mimeType === MIME_PDF
    ? { tipo: "documento", base64, mimeType: MIME_PDF }
    : { tipo: "imagen", base64, mimeType: archivo.mimeType };
}

/** Una celda con contenido, ya como texto. Fila y columna desde 0. */
interface Celda {
  fila: number;
  columna: number;
  texto: string;
}

interface HojaLeida {
  nombre: string;
  /** Ordenadas por fila y, dentro de la fila, por columna. */
  celdas: Celda[];
}

/** `SSF` viene tipado como `any` en SheetJS; esto es lo que se usa de él. */
const formatos = XLSX.SSF as {
  is_date(formato: string): boolean;
  parse_date_code(
    serie: number,
    opciones: { date1904: boolean },
  ): { y: number; m: number; d: number } | null;
};

/**
 * Serializa un libro de Excel (`.xlsx` o `.xls`) como texto posicional.
 *
 * Tres decisiones que separan que el modelo LEA la planilla de que la invente:
 *
 * - **Va la referencia de cada celda** (`B5`), no solo el valor. Una planilla
 *   de evolución se lee cruzando fila con columna ("el peso de la columna C"),
 *   y sin coordenadas no hay forma de asociar el 87.3 con el 15/03.
 * - **De una fórmula va el RESULTADO cacheado, no la fórmula.** La sumatoria
 *   de pliegues y los kg de grasa de la planilla del profesional son fórmulas;
 *   mandar `=SUM(B13:B18)` obligaría al modelo a hacer la cuenta, que es
 *   justo lo que no se le pide con datos clínicos.
 * - **Las fechas se escriben en ISO.** Excel las guarda como número de serie
 *   con formato de fecha; dejarlas en formato local reintroduce la ambigüedad
 *   día/mes que el prompt se toma el trabajo de cerrar.
 */
function planillaATexto(contenido: Uint8Array): string {
  let libro: XLSX.WorkBook;
  try {
    // `cellNF` conserva el formato de número de cada celda, que es lo único
    // que distingue una fecha (un número de serie con formato de fecha) de un
    // número cualquiera.
    libro = XLSX.read(contenido, {
      type: "array",
      cellNF: true,
      cellText: false,
    });
  } catch {
    throw new ErrorDocumentoNoInterpretable(
      "No se pudo abrir la planilla. Verificá que sea un Excel (.xlsx o .xls) válido y volvé a subirla.",
    );
  }

  const date1904 = libro.Workbook?.WBProps?.date1904 === true;
  const hojas: HojaLeida[] = libro.SheetNames.map((nombre) => ({
    nombre,
    celdas: celdasDe(libro.Sheets[nombre], date1904),
  }));
  const cuadro = primerCuadroDatosBrutos(hojas);

  const partes: string[] = [];
  let enviadas = 0;
  let truncada = false;

  for (const hoja of cuadro ? [cuadro] : hojas) {
    const filas = new Map<number, string[]>();
    for (const celda of hoja.celdas) {
      if (enviadas >= MAX_CELDAS) {
        truncada = true;
        break;
      }
      enviadas += 1;
      const referencia = XLSX.utils.encode_cell({
        r: celda.fila,
        c: celda.columna,
      });
      const fila = filas.get(celda.fila) ?? [];
      fila.push(`${referencia}: ${celda.texto}`);
      filas.set(celda.fila, fila);
    }
    if (filas.size > 0) {
      const renglones = [...filas.values()].map((valores) =>
        valores.join(" | "),
      );
      partes.push(`### Hoja "${hoja.nombre}"\n${renglones.join("\n")}`);
    }
    if (truncada) break;
  }

  if (partes.length === 0) {
    throw new ErrorDocumentoNoInterpretable(
      "La planilla no tiene ninguna celda con datos.",
    );
  }
  if (truncada) {
    partes.push(
      "[La planilla sigue, pero se cortó acá por tamaño. Interpretá solo lo de arriba.]",
    );
  }
  return partes.join("\n\n");
}

/** Las celdas con contenido de una hoja, en orden de lectura. */
function celdasDe(
  hoja: XLSX.WorkSheet | undefined,
  date1904: boolean,
): Celda[] {
  if (!hoja) return [];
  const celdas: Celda[] = [];
  for (const [referencia, celda] of Object.entries(hoja)) {
    // Las claves con "!" son metadatos de la hoja (rango, celdas combinadas).
    if (referencia.startsWith("!")) continue;
    const texto = textoDeCelda(celda as XLSX.CellObject, date1904);
    if (texto === null) continue;
    const { r, c } = XLSX.utils.decode_cell(referencia);
    celdas.push({ fila: r, columna: c, texto });
  }
  return celdas.sort((a, b) => a.fila - b.fila || a.columna - b.columna);
}

/** Valor de una celda como texto, ya resuelto (fórmulas, fechas, errores). */
function textoDeCelda(
  celda: XLSX.CellObject,
  date1904: boolean,
): string | null {
  switch (celda.t) {
    case "n": {
      if (typeof celda.v !== "number" || !Number.isFinite(celda.v)) {
        return null;
      }
      if (typeof celda.z === "string" && formatos.is_date(celda.z)) {
        // Se arma desde las partes y no con `Date`: así la zona horaria del
        // servidor no puede correr el día.
        const fecha = formatos.parse_date_code(celda.v, { date1904 });
        if (fecha) {
          return `${fecha.y}-${dosDigitos(fecha.m)}-${dosDigitos(fecha.d)}`;
        }
      }
      // El resultado cacheado de una fórmula arrastra el error del punto
      // flotante (`2.5999999999999943` por 2,6). Mandárselo así al modelo es
      // ruido que puede terminar copiado como medida.
      return String(Math.round(celda.v * 10000) / 10000);
    }
    case "s": {
      // Un salto de línea adentro de la celda partiría el renglón de su fila,
      // y el modelo ya no sabría a qué fila pertenece cada valor.
      const texto = String(celda.v).replace(/\s+/g, " ").trim();
      return texto || null;
    }
    case "b":
      return String(celda.v);
    case "d":
      return celda.v instanceof Date
        ? celda.v.toISOString().slice(0, 10)
        : null;
    default:
      // "e" es un error de Excel (#N/A, #¡NUM!: la mediana de una serie
      // vacía) y "z" una celda sin valor. Ninguno de los dos es un dato.
      return null;
  }
}

/**
 * De la proforma de antropometría, solo el primer cuadro de "Proc datos
 * brutos". Null si el libro no es esa proforma: entonces se manda entero.
 *
 * Esa proforma es un libro entero calculado a partir de UN cuadro: una fila
 * por medida, con sus series (serie 1…serie 5) y la mediana, más el nombre y
 * la fecha de la toma arriba. Todo lo demás —las cinco masas, el somatotipo,
 * las tablas de referencia por deporte de las columnas de al lado, la hoja
 * "Presentación"— sale de ahí. Mandar el libro entero son miles de celdas de
 * derivados y de valores de referencia que se confunden con medidas; mandar el
 * cuadro es mandar exactamente lo que el profesional midió.
 *
 * El cuadro se ubica por su encabezado (la fila de "mediana") y no por
 * coordenadas fijas, porque la proforma tiene variantes (con y sin
 * longitudes) que suman o sacan filas: va de la columna A hasta donde termina
 * ese encabezado, y de la fila 1 hasta el primer renglón vacío que le sigue.
 */
function primerCuadroDatosBrutos(hojas: HojaLeida[]): HojaLeida | null {
  const hoja = hojas.find(
    (candidata) => candidata.nombre.trim().toLowerCase() === HOJA_DATOS_BRUTOS,
  );
  const encabezado = hoja?.celdas.find(
    (celda) => celda.texto.toLowerCase() === "mediana",
  );
  if (!hoja || !encabezado) return null;

  const columnasEncabezado = new Set(
    hoja.celdas
      .filter((celda) => celda.fila === encabezado.fila)
      .map((celda) => celda.columna),
  );
  let ultimaColumna = encabezado.columna;
  while (columnasEncabezado.has(ultimaColumna + 1)) ultimaColumna += 1;

  const delCuadro = hoja.celdas.filter(
    (celda) => celda.columna <= ultimaColumna,
  );
  const filasConDatos = new Set(delCuadro.map((celda) => celda.fila));
  let ultimaFila = encabezado.fila;
  while (filasConDatos.has(ultimaFila + 1)) ultimaFila += 1;

  return {
    nombre: hoja.nombre,
    celdas: delCuadro.filter((celda) => celda.fila <= ultimaFila),
  };
}

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}

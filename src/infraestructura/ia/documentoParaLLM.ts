import mammoth from "mammoth";
import ExcelJS from "exceljs";
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
 *   valores sueltos. El `.xls` anterior a 2007 se rechaza igual que el `.doc`.
 */

const MIMES_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
const MIME_PDF = "application/pdf";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC_LEGADO = "application/msword";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIME_XLS_LEGADO = "application/vnd.ms-excel";

/** MIME types que `leerDocumentoParaLLM` sabe convertir. */
export const MIMES_INTERPRETABLES = [
  ...MIMES_IMAGEN,
  MIME_PDF,
  MIME_DOCX,
  MIME_XLSX,
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
  if (archivo.mimeType === MIME_XLS_LEGADO) {
    throw new ErrorDocumentoNoInterpretable(
      "El formato .xls (Excel anterior a 2007) no se puede leer. Guardá la planilla como .xlsx y volvé a subirla.",
    );
  }

  const esImagen = (MIMES_IMAGEN as readonly string[]).includes(
    archivo.mimeType,
  );
  if (
    !esImagen &&
    archivo.mimeType !== MIME_PDF &&
    archivo.mimeType !== MIME_DOCX &&
    archivo.mimeType !== MIME_XLSX
  ) {
    throw new ErrorDocumentoNoInterpretable(
      "Solo se puede autocompletar desde una foto (JPG, PNG, WEBP), un PDF, un Word (.docx) o un Excel (.xlsx).",
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

  if (archivo.mimeType === MIME_XLSX) {
    return { tipo: "texto", texto: await planillaATexto(contenido) };
  }

  const base64 = buffer.toString("base64");
  return archivo.mimeType === MIME_PDF
    ? { tipo: "documento", base64, mimeType: MIME_PDF }
    : { tipo: "imagen", base64, mimeType: archivo.mimeType };
}

/**
 * Serializa un libro de Excel como texto posicional.
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
 * - **Las fechas se escriben en ISO.** Excel las guarda como número de serie y
 *   `exceljs` las devuelve como `Date`; dejarlas en formato local reintroduce
 *   la ambigüedad día/mes que el prompt se toma el trabajo de cerrar.
 */
async function planillaATexto(contenido: Uint8Array): Promise<string> {
  const libro = new ExcelJS.Workbook();
  try {
    // Se copia a un ArrayBuffer propio: `exceljs` tipa su entrada como
    // ArrayBuffer, y el Uint8Array del bucket puede ser una vista sobre un
    // buffer más grande.
    await libro.xlsx.load(new Uint8Array(contenido).buffer);
  } catch {
    throw new ErrorDocumentoNoInterpretable(
      "No se pudo abrir la planilla. Verificá que sea un Excel (.xlsx) válido y volvé a subirla.",
    );
  }

  const partes: string[] = [];
  let celdas = 0;
  let truncada = false;

  for (const hoja of libro.worksheets) {
    const filas: string[] = [];
    hoja.eachRow({ includeEmpty: false }, (fila, numeroFila) => {
      if (truncada) return;
      const valores: string[] = [];
      fila.eachCell({ includeEmpty: false }, (celda, numeroColumna) => {
        if (truncada) return;
        const texto = valorDeCelda(celda.value);
        if (texto === null) return;
        if (celdas >= MAX_CELDAS) {
          truncada = true;
          return;
        }
        celdas += 1;
        valores.push(`${letraColumna(numeroColumna)}${numeroFila}: ${texto}`);
      });
      if (valores.length > 0) filas.push(valores.join(" | "));
    });
    if (filas.length > 0) {
      partes.push(`### Hoja "${hoja.name}"\n${filas.join("\n")}`);
    }
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

/** Valor de una celda como texto, ya resuelto (fórmulas, fechas, texto rico). */
function valorDeCelda(valor: ExcelJS.CellValue): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "number") {
    // El resultado cacheado de una fórmula arrastra el error del punto
    // flotante (`2.5999999999999943` por 2,6). Mandárselo así al modelo es
    // ruido que puede terminar copiado como medida.
    return String(Math.round(valor * 10000) / 10000);
  }
  if (typeof valor === "boolean") return String(valor);
  if (typeof valor === "string") return valor.trim() || null;

  if (typeof valor === "object") {
    // Fórmula (normal o compartida): interesa el resultado que Excel dejó
    // cacheado, no la expresión. Una fórmula sin resultado cacheado no aporta
    // nada legible y se descarta.
    if ("result" in valor) {
      return valorDeCelda(valor.result);
    }
    if ("richText" in valor) {
      const texto = valor.richText
        .map((parte) => parte.text)
        .join("")
        .trim();
      return texto || null;
    }
    if ("text" in valor) return String(valor.text).trim() || null;
  }
  return null;
}

/** Número de columna → letra de Excel (1 → A, 27 → AA). */
function letraColumna(numero: number): string {
  let resto = numero;
  let letras = "";
  while (resto > 0) {
    const indice = (resto - 1) % 26;
    letras = String.fromCharCode(65 + indice) + letras;
    resto = Math.floor((resto - indice) / 26);
  }
  return letras;
}

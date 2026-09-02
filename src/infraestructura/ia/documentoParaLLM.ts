import mammoth from "mammoth";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { BloqueUsuario } from "./IProveedorLLM";

/**
 * Convierte un archivo del bucket en el bloque que se le manda al LLM.
 *
 * Existe para que las dos lecturas de documentos clínicos —la historia clínica
 * de un paciente ya existente y la ficha con la que se da de alta uno nuevo—
 * acepten exactamente los mismos formatos. Estaban separadas y el Word solo
 * andaba en una.
 *
 * Los tres caminos son distintos a propósito:
 *
 * - **Imagen** y **PDF** viajan tal cual: el modelo los mira, y en un PDF eso
 *   incluye la maquetación (una ficha clínica suele ser una tabla, y el texto
 *   plano de una tabla pierde qué valor va con qué etiqueta).
 * - **Word** no lo lee ningún modelo. Se extrae el texto acá con `mammoth` y se
 *   manda como texto. El `.doc` viejo (binario, anterior a 2007) NO es un
 *   `.docx` renombrado y no se puede leer: se rechaza con un mensaje que dice
 *   qué hacer, en vez de mandar bytes ilegibles y recibir campos inventados.
 */

const MIMES_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
const MIME_PDF = "application/pdf";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC_LEGADO = "application/msword";

/** MIME types que `leerDocumentoParaLLM` sabe convertir. */
export const MIMES_INTERPRETABLES = [
  ...MIMES_IMAGEN,
  MIME_PDF,
  MIME_DOCX,
] as const;

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
  if (
    !esImagen &&
    archivo.mimeType !== MIME_PDF &&
    archivo.mimeType !== MIME_DOCX
  ) {
    throw new ErrorDocumentoNoInterpretable(
      "Solo se puede autocompletar desde una foto (JPG, PNG, WEBP), un PDF o un Word (.docx).",
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

  const base64 = buffer.toString("base64");
  return archivo.mimeType === MIME_PDF
    ? { tipo: "documento", base64, mimeType: MIME_PDF }
    : { tipo: "imagen", base64, mimeType: archivo.mimeType };
}

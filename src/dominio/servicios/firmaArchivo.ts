/**
 * Verificación del tipo real de un archivo por su firma binaria (magic bytes).
 *
 * ## Por qué hace falta
 *
 * `Archivo.crear` valida el MIME contra una lista blanca por contexto, pero ese
 * MIME sale de `File.type`, que es la cabecera `Content-Type` de la parte
 * multipart: **lo elige quien sube el archivo**. Un atacante que declara
 * `image/png` pasa la lista blanca con el contenido que quiera.
 *
 * Eso importa porque `/api/archivos/<id>/ver` devuelve el archivo con ese MIME,
 * en línea y desde el mismo origen que la app. Si el contenido era HTML y el
 * navegador llega a esnifarlo, ejecuta scripts con la sesión de quien lo abre —
 * y quien abre los adjuntos de un paciente es el nutricionista.
 *
 * Los primeros bytes de un archivo no mienten: son formato, no metadatos. Acá
 * se comparan contra la firma que corresponde al MIME declarado.
 *
 * ## Alcance
 *
 * Esto NO reemplaza al `nosniff` ni a la CSP de la respuesta; es la otra mitad.
 * Tampoco pretende validar que el archivo esté bien formado: valida que sea del
 * tipo que dice ser, que es la propiedad de la que depende servirlo.
 */

/** Firma de un formato: bytes esperados en una posición dada. */
interface Firma {
  /** Desplazamiento desde el inicio del archivo. */
  desde: number;
  /** Bytes esperados. `null` en una posición = "cualquier byte". */
  bytes: readonly (number | null)[];
}

/**
 * Firmas por tipo MIME. Solo están los tipos que la app acepta
 * (ver CONTEXTOS_ARCHIVO en entidades/Archivo.ts).
 */
const FIRMAS: Record<string, readonly Firma[]> = {
  "image/jpeg": [{ desde: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [
    { desde: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  // WEBP es un contenedor RIFF: "RIFF" ????  "WEBP".
  "image/webp": [
    {
      desde: 0,
      // R  I  F  F  (4 bytes de tamaño)  W  E  B  P
      bytes: [
        0x52,
        0x49,
        0x46,
        0x46,
        null,
        null,
        null,
        null,
        0x57,
        0x45,
        0x42,
        0x50,
      ],
    },
  ],
  // HEIC es ISO-BMFF: 4 bytes de tamaño, luego "ftyp" y una marca de formato.
  "image/heic": [
    {
      desde: 4,
      bytes: [0x66, 0x74, 0x79, 0x70], // "ftyp"
    },
  ],
  "application/pdf": [{ desde: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // "%PDF"
  // WebM es un contenedor Matroska/EBML. Es lo que graba MediaRecorder en
  // Chrome y Firefox; el códec (Opus) va adentro y no cambia la firma.
  "audio/webm": [{ desde: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  // MP4/M4A es ISO-BMFF: 4 bytes de tamaño y luego "ftyp". Es lo que graba
  // Safari.
  "audio/mp4": [{ desde: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // "ftyp"
  // OGG: "OggS".
  "audio/ogg": [{ desde: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }],
  // MP3: con etiqueta ID3 al principio, o directo el sync de un frame MPEG
  // (0xFF y los cuatro bits altos del siguiente byte en 1). La firma no sabe
  // expresar máscaras de bits, así que van las variantes que se ven en la
  // práctica: MPEG-1 capa 3 (0xFB/0xFA) y MPEG-2 capa 3 (0xF3/0xF2).
  "audio/mpeg": [
    { desde: 0, bytes: [0x49, 0x44, 0x33] }, // "ID3"
    { desde: 0, bytes: [0xff, 0xfb] },
    { desde: 0, bytes: [0xff, 0xfa] },
    { desde: 0, bytes: [0xff, 0xf3] },
    { desde: 0, bytes: [0xff, 0xf2] },
  ],
  // .doc es un contenedor OLE2 (Compound File Binary Format).
  "application/msword": [
    { desde: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  ],
  // .docx es un ZIP. Se aceptan las tres variantes de cabecera local de ZIP
  // (normal, vacío y "spanned"), que es lo que producen los distintos editores.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { desde: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
    { desde: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
    { desde: 0, bytes: [0x50, 0x4b, 0x07, 0x08] },
  ],
  // .xlsx es un ZIP, igual que el .docx: mismas tres cabeceras.
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { desde: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
    { desde: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
    { desde: 0, bytes: [0x50, 0x4b, 0x07, 0x08] },
  ],
};

/** ¿El contenido coincide con una firma concreta? */
function coincide(contenido: Uint8Array, firma: Firma): boolean {
  if (contenido.length < firma.desde + firma.bytes.length) return false;
  return firma.bytes.every(
    (esperado, i) =>
      esperado === null || contenido[firma.desde + i] === esperado,
  );
}

/**
 * ¿El contenido se corresponde con el MIME declarado?
 *
 * Devuelve `true` para un MIME del que no se tiene firma registrada: la lista
 * blanca de `Archivo.crear` es la que decide qué tipos se aceptan, y esta
 * función solo desmiente a los que sí sabe verificar. Así, agregar un tipo
 * nuevo a la lista blanca no rompe las subidas por olvidarse de esta tabla —
 * simplemente no gana la verificación extra hasta que se sume su firma.
 */
export function contenidoCoincideConMime(
  contenido: Uint8Array,
  mimeType: string,
): boolean {
  const firmas = FIRMAS[mimeType];
  if (!firmas) return true;
  return firmas.some((firma) => coincide(contenido, firma));
}

/** Tipos MIME para los que existe verificación de firma. */
export const MIMES_VERIFICABLES = Object.keys(FIRMAS);

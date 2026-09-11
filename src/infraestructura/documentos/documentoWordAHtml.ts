import mammoth from "mammoth";
import WordExtractor from "word-extractor";

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Un documento de Word como página HTML autónoma, para leerlo adentro de la
 * app: el plan que el profesional armó en Word y subió tal cual.
 *
 * Los dos formatos no dan lo mismo, y conviene saberlo:
 *
 * - **`.docx`** pasa por `mammoth`, que respeta la estructura: títulos,
 *   negritas, listas, tablas e imágenes. Lo que no trae es la maquetación
 *   —fuentes, colores, márgenes—, que es justamente lo que menos hace falta
 *   para leer un plan en el teléfono.
 * - **`.doc`** (binario, anterior a 2007) no lo convierte ninguna librería que
 *   conserve el formato. `word-extractor` saca el TEXTO, con las celdas de las
 *   tablas separadas por tabulaciones, y con eso se rearman párrafos y tablas.
 *   Sin negritas ni imágenes: legible, no idéntico.
 *
 * La página no lleva scripts y se sirve bajo `sandbox` (ver
 * `servidor/archivoHttp`): el HTML sale de un archivo que subió alguien, y que
 * la conversión escape el texto no tiene por qué ser la única barrera.
 */
export async function documentoWordAHtml(
  contenido: Uint8Array,
  mimeType: string,
  titulo: string,
): Promise<string> {
  const buffer = Buffer.from(contenido);
  const cuerpo =
    mimeType === MIME_DOCX
      ? (await mammoth.convertToHtml({ buffer })).value
      : textoAHtml((await new WordExtractor().extract(buffer)).getBody());
  return paginaHtml(titulo, cuerpo);
}

/** La página que se muestra cuando el documento no se pudo convertir. */
export function paginaDocumentoIlegible(titulo: string): string {
  return paginaHtml(
    titulo,
    "<p>No se pudo mostrar este documento acá adentro. Descargalo con el botón de arriba para abrirlo con Word.</p>",
  );
}

/**
 * El texto de un `.doc` como HTML: cada línea es un párrafo, y las que
 * terminan en tabulación —así devuelve `word-extractor` las filas de una
 * tabla, con una tabulación después de cada celda— se juntan en una tabla.
 *
 * Se mira la tabulación FINAL y no cualquiera: en un plan es común sangrar
 * con tabulación ("→ 1 taza de leche"), y eso es un párrafo, no una fila.
 */
export function textoAHtml(texto: string): string {
  const bloques: string[] = [];
  let filas: string[][] = [];

  const cerrarTabla = () => {
    if (filas.length === 0) return;
    const ancho = Math.max(...filas.map((fila) => fila.length));
    const html = filas
      .map(
        (fila) =>
          `<tr>${Array.from(
            { length: ancho },
            (_, indice) => `<td>${escapar(fila[indice] ?? "")}</td>`,
          ).join("")}</tr>`,
      )
      .join("");
    bloques.push(`<table>${html}</table>`);
    filas = [];
  };

  for (const linea of texto.split(/\r?\n/)) {
    if (linea.endsWith("\t")) {
      filas.push(
        linea
          .slice(0, -1)
          .split("\t")
          .map((celda) => celda.trim()),
      );
      continue;
    }
    cerrarTabla();
    // Se conserva la sangría del principio: la página respeta los espacios.
    if (linea.trim()) bloques.push(`<p>${escapar(linea.trimEnd())}</p>`);
  }
  cerrarTabla();

  return bloques.join("\n");
}

const ESTILOS = [
  ":root{color-scheme:light}",
  'body{margin:0;background:#fff;color:#1f2937;font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
  "main{max-width:820px;margin:0 auto;padding:24px 20px 40px}",
  "h1,h2,h3,h4{line-height:1.25;margin:1.2em 0 .5em}",
  "p{margin:0 0 .75em;white-space:pre-wrap}",
  "table{border-collapse:collapse;width:100%;margin:1em 0}",
  "td,th{border:1px solid #d1d5db;padding:6px 8px;vertical-align:top}",
  "td p,th p{margin:0}",
  "img{max-width:100%;height:auto}",
  "ul,ol{padding-left:1.4em}",
].join("");

function paginaHtml(titulo: string, cuerpo: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapar(titulo)}</title><style>${ESTILOS}</style></head><body><main>${cuerpo}</main></body></html>`;
}

const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter]!);
}

import type JSZip from "jszip";

/**
 * Lectura mínima de las partes de un xlsx (un zip de XML), para las imágenes
 * de la planilla de alimentos: las colocadas EN la celda (`imagenesEnCelda`)
 * y las que están SOBRE las celdas (`imagenesSobreCeldas`). exceljs lee solo
 * las celdas; ver `soloLasCeldas` en `parsearPlanillaAlimentos`.
 *
 * Son partes sin anidamientos del mismo elemento, así que se leen con un
 * lector mínimo de XML en vez de sumar una dependencia.
 */

/** Una imagen de la primera hoja y la celda en la que está. */
export interface ImagenDeCelda {
  /** Número de fila, desde 1 (como en Excel). */
  fila: number;
  /** Columna desde 0 (A = 0), como el índice de las celdas que lee el parser. */
  columna: number;
  contenido: Uint8Array;
  /** Extensión del archivo dentro del xlsx: png, jpeg, jpg, gif, webp… */
  extension: string;
}

export interface Elemento {
  atributos: Record<string, string>;
  contenido: string;
}

/** Una relación de una parte: su tipo y la ruta de su destino dentro del zip. */
export interface Relacion {
  tipo: string;
  ruta: string;
}

/**
 * Una parte como texto. `null` si no está o si supera `tope` caracteres: una
 * parte de ese tamaño no la escribió una planilla, y se ignora.
 */
export async function leerParte(
  zip: JSZip,
  ruta: string,
  tope = Infinity,
): Promise<string | null> {
  const texto = await zip.file(ruta)?.async("string");
  return texto != null && texto.length <= tope ? texto : null;
}

/**
 * Las relaciones de una parte (su `_rels/<nombre>.rels`) por Id, con el
 * destino ya resuelto contra la carpeta de la parte. Las que apuntan afuera
 * del archivo (una imagen vinculada, no incrustada) se omiten.
 */
export async function relacionesDe(
  zip: JSZip,
  rutaParte: string,
  tope = Infinity,
): Promise<Map<string, Relacion>> {
  const barra = rutaParte.lastIndexOf("/");
  const carpeta = rutaParte.slice(0, barra + 1);
  const rels = await leerParte(
    zip,
    `${carpeta}_rels/${rutaParte.slice(barra + 1)}.rels`,
    tope,
  );
  const relaciones = new Map<string, Relacion>();
  for (const { atributos } of elementos(rels ?? "", "Relationship")) {
    const { Id: id, Type: tipo, Target: destino, TargetMode: modo } = atributos;
    if (!id || !destino || modo === "External") continue;
    relaciones.set(id, {
      tipo: tipo ?? "",
      ruta: resolverRuta(carpeta, destino),
    });
  }
  return relaciones;
}

/** El archivo de la primera hoja según workbook.xml (el orden de las pestañas). */
export async function rutaDeLaPrimeraHoja(zip: JSZip): Promise<string | null> {
  const libro = await leerParte(zip, "xl/workbook.xml");
  const primera = libro ? elementos(libro, "sheet")[0] : undefined;
  const id = primera ? atributoConSufijo(primera.atributos, ":id") : null;
  if (!id) return null;
  return (await relacionesDe(zip, "xl/workbook.xml")).get(id)?.ruta ?? null;
}

/**
 * Lee cada archivo de `xl/media` una sola vez: mil filas con la misma imagen
 * son mil referencias a los mismos bytes (el mismo `Uint8Array`), no mil
 * copias, y el caso de uso la achica una sola vez.
 */
export function lectorDeMedios(
  zip: JSZip,
): (ruta: string) => Promise<Uint8Array | null> {
  const medios = new Map<string, Uint8Array | null>();
  return async (ruta) => {
    if (!medios.has(ruta)) {
      medios.set(ruta, (await zip.file(ruta)?.async("uint8array")) ?? null);
    }
    return medios.get(ruta) ?? null;
  };
}

/** «xl/media/image1.PNG» → «png». */
export function extensionDe(ruta: string): string {
  return ruta.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Los elementos `<nombre …>` de un XML (con o sin prefijo de espacio de
 * nombres), con sus atributos y su contenido. Vale para las partes de Excel
 * que se leen acá, donde un elemento nunca contiene a otro del mismo nombre.
 *
 * Recorre el texto una sola vez por construcción, sin depender de cómo
 * resuelva el motor de expresiones regulares una apertura sin cierre: el
 * archivo lo sube un usuario y corre en el proceso de la app, el de todos
 * los consultorios. Por eso la apertura no cruza un `<` y, si un cierre no
 * aparece, se deja de buscar: tampoco va a aparecer más adelante.
 */
export function elementos(xml: string, nombre: string): Elemento[] {
  const apertura = new RegExp(
    `<(?:[\\w.-]+:)?${nombre}(?=[\\s/>])([^<>]*)>`,
    "g",
  );
  const cierre = new RegExp(`</(?:[\\w.-]+:)?${nombre}\\s*>`, "g");
  const encontrados: Elemento[] = [];
  for (
    let abierto = apertura.exec(xml);
    abierto;
    abierto = apertura.exec(xml)
  ) {
    const atributos = abierto[1] ?? "";
    if (atributos.endsWith("/")) {
      encontrados.push({
        atributos: leerAtributos(atributos.slice(0, -1)),
        contenido: "",
      });
      continue;
    }
    cierre.lastIndex = apertura.lastIndex;
    const cerrado = cierre.exec(xml);
    if (!cerrado) break;
    encontrados.push({
      atributos: leerAtributos(atributos),
      contenido: xml.slice(apertura.lastIndex, cerrado.index),
    });
    apertura.lastIndex = cierre.lastIndex;
  }
  return encontrados;
}

/** `r:id`, `r:embed`… con cualquier prefijo (Excel usa `r`, pero no está garantizado). */
export function atributoConSufijo(
  atributos: Record<string, string>,
  sufijo: string,
): string | null {
  const clave = Object.keys(atributos).find((k) => k.endsWith(sufijo));
  return clave ? atributos[clave]! : null;
}

/** Resuelve el `Target` de una relación contra la carpeta de su parte. */
export function resolverRuta(carpeta: string, destino: string): string {
  if (destino.startsWith("/")) return destino.slice(1);
  const partes = carpeta.split("/").filter(Boolean);
  for (const segmento of destino.split("/")) {
    if (segmento === "..") partes.pop();
    else if (segmento !== ".") partes.push(segmento);
  }
  return partes.join("/");
}

/**
 * Los atributos de una etiqueta. El nombre tiene que empezar después de un
 * espacio (o al principio): así una palabra larga sin `=` se recorre una
 * vez y no una vez por cada letra. Sin eso, una etiqueta con 100.000 letras
 * seguidas tardaba 7 s en leerse, y el tiempo crece con el cuadrado del
 * largo.
 */
function leerAtributos(texto: string): Record<string, string> {
  const atributos: Record<string, string> = {};
  for (const [, nombre, doble, simple] of texto.matchAll(
    /(?:^|\s)([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    atributos[nombre!] = decodificar(doble ?? simple ?? "");
  }
  return atributos;
}

function decodificar(valor: string): string {
  return valor
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

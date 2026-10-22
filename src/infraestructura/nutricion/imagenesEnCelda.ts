import JSZip from "jszip";

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

/** La clave del valor enriquecido que apunta a la imagen. */
const CLAVE_IMAGEN = "_rvRel:LocalImageIdentifier";

/**
 * Tope, en caracteres, de cada parte de valores enriquecidos (metadata.xml y
 * richData/*). Excel escribe unos 100 por imagen, así que 2 MB son decenas de
 * miles de imágenes. Más que eso no es una planilla de Excel: es un archivo
 * armado para hacer trabajar al servidor, y se ignora (la planilla entra sin
 * imágenes en celda). La hoja no lleva tope: la validó exceljs al abrirla.
 */
const TAMANO_MAXIMO_PARTE = 2 * 1024 * 1024;

/**
 * Las imágenes COLOCADAS EN LA CELDA de la primera hoja de un xlsx.
 *
 * Excel 365 tiene dos maneras de insertar una imagen: «sobre las celdas» (un
 * dibujo flotante anclado a una celda, que exceljs sí lee) y «en la celda»
 * (Insertar › Imágenes › Colocar en celda), que es la natural para una
 * columna «Imagen» y que exceljs ignora. Esta función lee la segunda.
 *
 * En el archivo, una imagen en celda es un VALOR ENRIQUECIDO: la celda lleva
 * `vm="N"` y de ahí se llega a la imagen por cuatro índices encadenados:
 *
 *   celda vm (1..) → metadata.xml <valueMetadata><bk><rc v>
 *     → <futureMetadata name="XLRICHVALUE"><bk><xlrd:rvb i>
 *     → richData/rdrichvalue.xml <rv s> (sus <v> en el orden de la estructura s)
 *     → richData/richValueRel.xml <rel r:id> → su .rels → ../media/imageN.png
 *
 * Son partes generadas por Excel, sin anidamientos del mismo elemento, así
 * que se leen con un lector mínimo de XML en vez de sumar una dependencia.
 * Cualquier eslabón que falte o no tenga la forma esperada hace que esa
 * imagen no aparezca, nunca que falle la planilla: las imágenes son opcionales.
 *
 * Las celdas que muestran la MISMA imagen reciben los mismos bytes (el mismo
 * `Uint8Array`): se descomprime una vez por archivo de `xl/media`, no una
 * vez por fila.
 */
export async function leerImagenesEnCelda(
  contenido: Uint8Array,
): Promise<ImagenDeCelda[]> {
  const zip = await JSZip.loadAsync(contenido);
  const leer = (ruta: string) => zip.file(ruta)?.async("string") ?? null;

  const [metadata, valores, estructuras, relaciones, relsDeRelaciones] =
    await Promise.all([
      leer("xl/metadata.xml"),
      leer("xl/richData/rdrichvalue.xml"),
      leer("xl/richData/rdrichvaluestructure.xml"),
      leer("xl/richData/richValueRel.xml"),
      leer("xl/richData/_rels/richValueRel.xml.rels"),
    ]);
  const partes = [metadata, valores, estructuras, relaciones, relsDeRelaciones];
  // Sin valores enriquecidos no hay imágenes en celda: el caso común.
  if (
    !metadata ||
    !valores ||
    !estructuras ||
    !relaciones ||
    !relsDeRelaciones ||
    partes.some((parte) => (parte?.length ?? 0) > TAMANO_MAXIMO_PARTE)
  ) {
    return [];
  }
  const rutaHoja = await rutaDeLaPrimeraHoja(zip);
  const hoja = rutaHoja ? await leer(rutaHoja) : null;
  if (!hoja) return [];

  // metadata.xml: vm → índice del valor enriquecido.
  const tipos = elementos(metadata, "metadataType").map(
    (t) => t.atributos.name,
  );
  const futuros =
    elementos(metadata, "futureMetadata").find(
      (f) => f.atributos.name === "XLRICHVALUE",
    )?.contenido ?? "";
  const indiceDeFuturo = elementos(futuros, "bk").map((bk) => {
    const rvb = elementos(bk.contenido, "rvb")[0];
    return rvb ? Number(rvb.atributos.i) : NaN;
  });
  const valueMetadata =
    elementos(metadata, "valueMetadata")[0]?.contenido ?? "";
  const valorDeVm = elementos(valueMetadata, "bk").map((bk) => {
    const rc = elementos(bk.contenido, "rc")[0];
    if (!rc) return NaN;
    // `t` es 1-based sobre <metadataTypes>: tiene que ser el de valores ricos.
    if (tipos[Number(rc.atributos.t) - 1] !== "XLRICHVALUE") return NaN;
    return indiceDeFuturo[Number(rc.atributos.v)] ?? NaN;
  });

  // rdrichvalue + estructura: valor enriquecido → índice de la relación.
  const posicionDeLaImagen = elementos(estructuras, "s").map((s) =>
    elementos(s.contenido, "k").findIndex(
      (k) => k.atributos.n === CLAVE_IMAGEN,
    ),
  );
  const relacionDeValor = elementos(valores, "rv").map((rv) => {
    const posicion = posicionDeLaImagen[Number(rv.atributos.s)] ?? -1;
    if (posicion < 0) return NaN; // un valor enriquecido que no es una imagen
    const v = elementos(rv.contenido, "v")[posicion];
    return v ? Number(v.contenido.trim()) : NaN;
  });

  // richValueRel + sus .rels: índice de la relación → archivo en xl/media.
  const destinos = new Map(
    elementos(relsDeRelaciones, "Relationship").map((r) => [
      r.atributos.Id,
      r.atributos.Target,
    ]),
  );
  const archivoDeRelacion = elementos(relaciones, "rel").map((rel) => {
    const id = atributoConSufijo(rel.atributos, ":id");
    const destino = id ? destinos.get(id) : undefined;
    return destino ? resolverRuta("xl/richData/", destino) : null;
  });

  // Una lectura por archivo: mil filas con la misma imagen son mil
  // referencias a los mismos bytes, no mil copias.
  const medios = new Map<string, Uint8Array | null>();
  const medio = async (ruta: string): Promise<Uint8Array | null> => {
    if (!medios.has(ruta)) {
      medios.set(ruta, (await zip.file(ruta)?.async("uint8array")) ?? null);
    }
    return medios.get(ruta) ?? null;
  };

  const imagenes: ImagenDeCelda[] = [];
  for (const celda of elementos(hoja, "c")) {
    const vm = Number(celda.atributos.vm);
    const referencia = celda.atributos.r;
    if (!Number.isInteger(vm) || vm < 1 || !referencia) continue;
    const posicion = posicionDeCelda(referencia);
    const valor = valorDeVm[vm - 1];
    const relacion = valor == null ? NaN : relacionDeValor[valor];
    const ruta = relacion == null ? null : archivoDeRelacion[relacion];
    if (!posicion || !ruta) continue;
    const bytes = await medio(ruta);
    if (!bytes) continue;
    imagenes.push({
      ...posicion,
      contenido: bytes,
      extension: ruta.split(".").pop()?.toLowerCase() ?? "",
    });
  }
  return imagenes;
}

/** El archivo de la primera hoja según workbook.xml (el orden de las pestañas). */
async function rutaDeLaPrimeraHoja(zip: JSZip): Promise<string | null> {
  const libro = await zip.file("xl/workbook.xml")?.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!libro || !rels) return null;
  const primera = elementos(libro, "sheet")[0];
  const id = primera ? atributoConSufijo(primera.atributos, ":id") : null;
  const destino = elementos(rels, "Relationship").find(
    (r) => r.atributos.Id === id,
  )?.atributos.Target;
  return destino ? resolverRuta("xl/", destino) : null;
}

interface Elemento {
  atributos: Record<string, string>;
  contenido: string;
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
function elementos(xml: string, nombre: string): Elemento[] {
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

/** `r:id` con cualquier prefijo (Excel usa `r`, pero no está garantizado). */
function atributoConSufijo(
  atributos: Record<string, string>,
  sufijo: string,
): string | null {
  const clave = Object.keys(atributos).find((k) => k.endsWith(sufijo));
  return clave ? atributos[clave]! : null;
}

function decodificar(valor: string): string {
  return valor
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Resuelve el `Target` de una relación contra la carpeta de su parte. */
function resolverRuta(carpeta: string, destino: string): string {
  if (destino.startsWith("/")) return destino.slice(1);
  const partes = carpeta.split("/").filter(Boolean);
  for (const segmento of destino.split("/")) {
    if (segmento === "..") partes.pop();
    else if (segmento !== ".") partes.push(segmento);
  }
  return partes.join("/");
}

/** «J2» → fila 2, columna 9 (A = 0). */
function posicionDeCelda(
  referencia: string,
): { fila: number; columna: number } | null {
  const partes = /^([A-Z]+)(\d+)$/.exec(referencia.toUpperCase());
  if (!partes) return null;
  let columna = 0;
  for (const letra of partes[1]!)
    columna = columna * 26 + letra.charCodeAt(0) - 64;
  return { fila: Number(partes[2]), columna: columna - 1 };
}

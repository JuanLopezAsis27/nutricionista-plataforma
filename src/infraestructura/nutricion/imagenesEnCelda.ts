import type JSZip from "jszip";
import {
  atributoConSufijo,
  elementos,
  extensionDe,
  lectorDeMedios,
  leerParte,
  relacionesDe,
  rutaDeLaPrimeraHoja,
  type ImagenDeCelda,
} from "./partesXlsx";

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
 * dibujo flotante anclado a una celda, ver `imagenesSobreCeldas`) y «en la
 * celda» (Insertar › Imágenes › Colocar en celda), que es la natural para una
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
 * Cualquier eslabón que falte o no tenga la forma esperada hace que esa
 * imagen no aparezca, nunca que falle la planilla: las imágenes son opcionales.
 *
 * Las celdas que muestran la MISMA imagen reciben los mismos bytes (el mismo
 * `Uint8Array`): se descomprime una vez por archivo de `xl/media`, no una
 * vez por fila.
 */
export async function leerImagenesEnCelda(
  zip: JSZip,
): Promise<ImagenDeCelda[]> {
  const leer = (ruta: string) => leerParte(zip, ruta, TAMANO_MAXIMO_PARTE);
  const [metadata, valores, estructuras, relaciones] = await Promise.all([
    leer("xl/metadata.xml"),
    leer("xl/richData/rdrichvalue.xml"),
    leer("xl/richData/rdrichvaluestructure.xml"),
    leer("xl/richData/richValueRel.xml"),
  ]);
  // Sin valores enriquecidos no hay imágenes en celda: el caso común. Una
  // parte de más del tope también da null.
  if (!metadata || !valores || !estructuras || !relaciones) return [];
  const rutaHoja = await rutaDeLaPrimeraHoja(zip);
  const hoja = rutaHoja ? await leerParte(zip, rutaHoja) : null;
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
  const destinos = await relacionesDe(
    zip,
    "xl/richData/richValueRel.xml",
    TAMANO_MAXIMO_PARTE,
  );
  const archivoDeRelacion = elementos(relaciones, "rel").map((rel) => {
    const id = atributoConSufijo(rel.atributos, ":id");
    return (id ? destinos.get(id)?.ruta : undefined) ?? null;
  });

  const medio = lectorDeMedios(zip);

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
      extension: extensionDe(ruta),
    });
  }
  return imagenes;
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

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

/**
 * Tope, en caracteres, del dibujo de la hoja y de sus relaciones. Excel
 * escribe poco más de 1.000 por imagen y openpyxl unos 400, así que 32 MB
 * alcanzan para una imagen en cada una de las 20.000 filas que admite la
 * planilla. Un dibujo más grande se ignora: la planilla entra sin estas
 * imágenes.
 */
const TAMANO_MAXIMO_DIBUJO = 32 * 1024 * 1024;

/**
 * Las imágenes SOBRE las celdas de la primera hoja (un dibujo flotante), cada
 * una en la celda de su esquina superior izquierda.
 *
 *   hoja → su .rels (la relación de tipo drawing) → xl/drawings/drawingN.xml
 *     → <twoCellAnchor> / <oneCellAnchor>: <from><col><row> y <pic><a:blip r:embed>
 *     → el .rels del dibujo → xl/media/imageN.png
 *
 * Las leía exceljs, pero exceljs solo entiende un dibujo que empiece con
 * `<xdr:wsDr>`, que es como lo escribe Excel. openpyxl, la librería de Python
 * con la que se arman muchas planillas, escribe el mismo XML con el espacio
 * de nombres por defecto (`<wsDr xmlns="…">`), y con ese exceljs no perdía
 * la imagen: no abría la planilla. Este lector ignora el prefijo.
 *
 * Un ancla sin imagen (una forma, un cuadro de texto) o anclada a una
 * posición absoluta y no a una celda se saltea, como lo hacía exceljs.
 */
export async function leerImagenesSobreCeldas(
  zip: JSZip,
): Promise<ImagenDeCelda[]> {
  const rutaHoja = await rutaDeLaPrimeraHoja(zip);
  if (!rutaHoja) return [];
  // Una hoja tiene a lo sumo un dibujo.
  const rutaDibujo = [...(await relacionesDe(zip, rutaHoja)).values()].find(
    (relacion) => relacion.tipo.endsWith("/drawing"),
  )?.ruta;
  if (!rutaDibujo) return [];
  const dibujo = await leerParte(zip, rutaDibujo, TAMANO_MAXIMO_DIBUJO);
  if (!dibujo) return [];
  const destinos = await relacionesDe(zip, rutaDibujo, TAMANO_MAXIMO_DIBUJO);
  const medio = lectorDeMedios(zip);

  const imagenes: ImagenDeCelda[] = [];
  const anclas = [
    ...elementos(dibujo, "twoCellAnchor"),
    ...elementos(dibujo, "oneCellAnchor"),
  ];
  for (const { contenido: ancla } of anclas) {
    const desde = elementos(ancla, "from")[0]?.contenido ?? "";
    const columna = indice(elementos(desde, "col")[0]?.contenido);
    const fila = indice(elementos(desde, "row")[0]?.contenido);
    const imagen = elementos(ancla, "pic")[0]?.contenido ?? "";
    const blip = elementos(imagen, "blip")[0];
    const id = blip ? atributoConSufijo(blip.atributos, ":embed") : null;
    const ruta = id ? destinos.get(id)?.ruta : undefined;
    if (columna == null || fila == null || !ruta) continue;
    const bytes = await medio(ruta);
    if (!bytes) continue;
    // Las anclas cuentan desde 0; las filas de Excel, desde 1.
    imagenes.push({
      fila: fila + 1,
      columna,
      contenido: bytes,
      extension: extensionDe(ruta),
    });
  }
  return imagenes;
}

/** El número de fila o de columna de un ancla (desde 0); null si no lo es. */
function indice(texto: string | undefined): number | null {
  if (texto == null || texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

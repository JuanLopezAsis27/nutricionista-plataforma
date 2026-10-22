import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import sharp from "sharp";
import { parsearPlanillaAlimentos } from "./parsearPlanillaAlimentos";
import {
  escribirPlanillaAlimentos,
  type AlimentoParaPlanilla,
} from "./escribirPlanillaAlimentos";

/**
 * Las imágenes que trae un xlsx, en sus dos formas: flotando SOBRE una celda
 * (la que lee exceljs) y COLOCADA EN la celda (Excel 365, que hay que leer del
 * zip). La de en-celda se arma a mano con las mismas partes que escribe Excel:
 * metadata.xml y richData/*.
 */

const COLUMNA_IMAGEN = 9; // J, base 0: la última columna del modelo

function alimento(nombre: string): AlimentoParaPlanilla {
  return {
    nombre,
    marca: null,
    caloriasPor100: 100,
    proteinasPor100: null,
    carbohidratosPor100: null,
    grasasPor100: null,
    categoria: null,
    unidadBase: "GRAMO",
    medidas: [],
  };
}

async function png(color: number): Promise<Buffer> {
  const { data } = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: color, g: 0, b: 0 },
    },
  })
    .png()
    .toUint8Array();
  return Buffer.from(data);
}

/** El modelo con Arroz (fila 2) y Pollo (fila 3), abierto en exceljs. */
async function modelo(): Promise<{
  libro: ExcelJS.Workbook;
  hoja: ExcelJS.Worksheet;
}> {
  const contenido = await escribirPlanillaAlimentos([
    { nombre: "Alimentos", alimentos: [alimento("Arroz"), alimento("Pollo")] },
  ]);
  const libro = new ExcelJS.Workbook();
  type CargaXlsx = Parameters<typeof libro.xlsx.load>[0];
  await libro.xlsx.load(Buffer.from(contenido) as unknown as CargaXlsx);
  return { libro, hoja: libro.worksheets[0]! };
}

/** Una imagen flotante con su esquina superior izquierda en (fila, columna), base 0. */
function sobreLaCelda(
  libro: ExcelJS.Workbook,
  hoja: ExcelJS.Worksheet,
  imagen: Buffer,
  fila: number,
  columna: number,
): void {
  type BufferExcel = Parameters<typeof libro.addImage>[0]["buffer"];
  const id = libro.addImage({
    buffer: imagen as unknown as BufferExcel,
    extension: "png",
  });
  hoja.addImage(id, {
    tl: { col: columna, row: fila },
    ext: { width: 20, height: 20 },
  });
}

/**
 * El modelo con Arroz (fila 2) y Pollo (fila 3) y la misma imagen COLOCADA EN
 * cada celda de `celdas` (de la columna J), con las partes que escribe Excel
 * 365. `partes` reemplaza alguna de ellas.
 */
async function planillaConImagenEnCelda(
  imagen: Buffer,
  celdas: string[],
  partes: Record<string, string> = {},
): Promise<Buffer> {
  const contenido = await escribirPlanillaAlimentos([
    { nombre: "Alimentos", alimentos: [alimento("Arroz"), alimento("Pollo")] },
  ]);
  const zip = await JSZip.loadAsync(contenido);
  const rutaHoja = "xl/worksheets/sheet1.xml";
  let hoja = await zip.file(rutaHoja)!.async("string");
  for (const celda of celdas) {
    const fila = celda.slice(1);
    // Una celda con valor enriquecido, como la escribe Excel.
    hoja = hoja.replace(
      new RegExp(`(<row r="${fila}"[^>]*>[\\s\\S]*?)(</row>)`),
      `$1<c r="${celda}" t="e" vm="1"><v>#VALUE!</v></c>$2`,
    );
  }
  zip.file(rutaHoja, hoja);
  const porDefecto: Record<string, string> = {
    "xl/metadata.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xlrd="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata"><metadataTypes count="1"><metadataType name="XLRICHVALUE" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1"/></metadataTypes><futureMetadata name="XLRICHVALUE" count="1"><bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="0"/></ext></extLst></bk></futureMetadata><valueMetadata count="1"><bk><rc t="1" v="0"/></bk></valueMetadata></metadata>`,
    "xl/richData/rdrichvalue.xml": `<rvData xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><rv s="0"><v>0</v><v>5</v></rv></rvData>`,
    "xl/richData/rdrichvaluestructure.xml": `<rvStructures xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><s t="_localImage"><k n="_rvRel:LocalImageIdentifier" t="i"/><k n="CalcOrigin" t="i"/></s></rvStructures>`,
    "xl/richData/richValueRel.xml": `<richValueRels xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><rel r:id="rId1"/></richValueRels>`,
    "xl/richData/_rels/richValueRel.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`,
  };
  for (const [ruta, texto] of Object.entries({ ...porDefecto, ...partes })) {
    zip.file(ruta, texto);
  }
  zip.file("xl/media/image1.png", imagen);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function leer(libro: ExcelJS.Workbook) {
  const bytes = await libro.xlsx.writeBuffer();
  return parsearPlanillaAlimentos(Buffer.from(bytes), "alimentos.xlsx");
}

describe("parsearPlanillaAlimentos: imágenes", () => {
  it("lee una imagen SOBRE la celda y la asigna a la fila de su esquina", async () => {
    const { libro, hoja } = await modelo();
    sobreLaCelda(libro, hoja, await png(10), 2, COLUMNA_IMAGEN); // fila 3: Pollo

    const { filas, imagenes } = await leer(libro);

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
    expect(imagenes.has(0)).toBe(false);
    expect(imagenes.get(1)?.mimeType).toBe("image/png");
  });

  it("con dos imágenes en la fila, gana la de la columna «Imagen»", async () => {
    const { libro, hoja } = await modelo();
    const enOtraColumna = await png(10);
    const enLaColumna = await png(250);
    sobreLaCelda(libro, hoja, enOtraColumna, 1, 0);
    sobreLaCelda(libro, hoja, enLaColumna, 1, COLUMNA_IMAGEN);

    const { imagenes } = await leer(libro);

    expect(Buffer.from(imagenes.get(0)!.contenido)).toEqual(enLaColumna);
  });

  it("ignora la imagen del encabezado y la de una fila sin nombre", async () => {
    const { libro, hoja } = await modelo();
    sobreLaCelda(libro, hoja, await png(10), 0, COLUMNA_IMAGEN); // encabezado
    hoja.getRow(5).getCell(2).value = "una marca sin alimento";
    sobreLaCelda(libro, hoja, await png(20), 4, COLUMNA_IMAGEN); // fila 5

    const { filas, imagenes } = await leer(libro);

    expect(filas).toHaveLength(2);
    expect(imagenes.size).toBe(0);
  });

  it("la misma imagen en dos filas llega con los MISMOS bytes, no con dos copias", async () => {
    const { libro, hoja } = await modelo();
    type BufferExcel = Parameters<typeof libro.addImage>[0]["buffer"];
    const id = libro.addImage({
      buffer: (await png(10)) as unknown as BufferExcel,
      extension: "png",
    });
    for (const fila of [1, 2]) {
      hoja.addImage(id, {
        tl: { col: COLUMNA_IMAGEN, row: fila },
        ext: { width: 20, height: 20 },
      });
    }

    const { imagenes } = await leer(libro);

    // Es lo que deja al caso de uso achicarla una sola vez.
    expect(imagenes.get(0)!.contenido).toBe(imagenes.get(1)!.contenido);
  });

  it("lee una imagen COLOCADA EN la celda (Excel 365)", async () => {
    const imagen = await png(99);

    const { filas, imagenes } = await parsearPlanillaAlimentos(
      await planillaConImagenEnCelda(imagen, ["J3"]),
      "alimentos.xlsx",
    );

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
    expect(imagenes.has(0)).toBe(false);
    expect(imagenes.get(1)?.mimeType).toBe("image/png");
    expect(Buffer.from(imagenes.get(1)!.contenido)).toEqual(imagen);
  });

  it("en celda, la misma imagen en dos filas también comparte los bytes", async () => {
    const { imagenes } = await parsearPlanillaAlimentos(
      await planillaConImagenEnCelda(await png(99), ["J2", "J3"]),
      "alimentos.xlsx",
    );

    expect(imagenes.get(0)!.contenido).toBe(imagenes.get(1)!.contenido);
  });

  // El archivo lo sube un usuario: una parte armada para hacer trabajar al
  // servidor no puede trabar el proceso. Con el lector de atributos anterior,
  // este caso (1,5 millones de letras sin `=`) tardaba cerca de media hora.
  it("una parte armada para trabar el servidor se lee en tiempo lineal", async () => {
    const inicio = performance.now();

    const { filas, imagenes } = await parsearPlanillaAlimentos(
      await planillaConImagenEnCelda(await png(99), ["J3"], {
        "xl/richData/rdrichvalue.xml": `<rv ${"a".repeat(1_500_000)}/>`,
      }),
      "alimentos.xlsx",
    );

    expect(performance.now() - inicio).toBeLessThan(3000);
    expect(filas).toHaveLength(2); // los datos entran igual
    expect(imagenes.size).toBe(0);
  });

  it("una parte de valores enriquecidos de más de 2 MB se ignora", async () => {
    const valores = `<rvData><rv s="0"><v>0</v><v>5</v></rv>${" ".repeat(2 * 1024 * 1024)}</rvData>`;

    const { filas, imagenes } = await parsearPlanillaAlimentos(
      await planillaConImagenEnCelda(await png(99), ["J3"], {
        "xl/richData/rdrichvalue.xml": valores,
      }),
      "alimentos.xlsx",
    );

    expect(filas).toHaveLength(2);
    expect(imagenes.size).toBe(0);
  });

  it("un CSV no trae imágenes", async () => {
    const { filas, imagenes } = await parsearPlanillaAlimentos(
      Buffer.from("Nombre;Calorías\nArroz;130\n"),
      "alimentos.csv",
    );
    expect(filas).toHaveLength(1);
    expect(imagenes.size).toBe(0);
  });
});

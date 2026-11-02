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

// L, base 0: la última columna del modelo (con «Cafeína» y «Descripción»,
// migración 95, pasó de la J a la L).
const COLUMNA_IMAGEN = 11;

function alimento(nombre: string): AlimentoParaPlanilla {
  return {
    nombre,
    marca: null,
    caloriasPor100: 100,
    proteinasPor100: null,
    carbohidratosPor100: null,
    grasasPor100: null,
    cafeinaPor100: null,
    descripcion: null,
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
 * cada celda de `celdas` (de la columna L), con las partes que escribe Excel
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

const RELACION =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PAQUETE = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * El modelo con Arroz (fila 2) y Pollo (fila 3) como lo guarda openpyxl
 * (Python), con lo que exceljs no sabía abrir: las notas del encabezado en
 * `xl/comments/comment1.xml`, las relaciones con rutas absolutas y, con
 * `imagen`, un dibujo SIN el prefijo `xdr:` con la imagen en la columna L de
 * `fila`. `tabla` le suma una tabla, también con ruta absoluta. Es la forma
 * de la planilla con la que se encontró el problema.
 */
async function planillaDeOpenpyxl(
  opciones: { imagen?: Buffer; fila?: number; tabla?: boolean } = {},
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(
    await escribirPlanillaAlimentos([
      {
        nombre: "Alimentos",
        alimentos: [alimento("Arroz"), alimento("Pollo")],
      },
    ]),
  );
  const notas = await zip.file("xl/comments1.xml")!.async("string");
  zip.remove("xl/comments1.xml");
  zip.file("xl/comments/comment1.xml", notas);
  const relaciones = [
    `<Relationship Type="${RELACION}/comments" Target="/xl/comments/comment1.xml" Id="comments" />`,
    `<Relationship Type="${RELACION}/vmlDrawing" Target="/xl/drawings/vmlDrawing1.vml" Id="anysvml" />`,
  ];
  let hoja = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  hoja = hoja.replace(
    /<legacyDrawing r:id="[^"]*"\/>/,
    '<legacyDrawing r:id="anysvml"/>',
  );
  if (opciones.imagen) {
    relaciones.push(
      `<Relationship Type="${RELACION}/drawing" Target="/xl/drawings/drawing1.xml" Id="rId1" />`,
    );
    hoja = hoja.replace(
      "<legacyDrawing",
      '<drawing r:id="rId1"/><legacyDrawing',
    );
    zip.file(
      "xl/drawings/drawing1.xml",
      `<wsDr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${RELACION}" xmlns="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"><oneCellAnchor><from><col>${COLUMNA_IMAGEN}</col><colOff>0</colOff><row>${(opciones.fila ?? 2) - 1}</row><rowOff>0</rowOff></from><ext cx="533400" cy="352425" /><pic><nvPicPr><cNvPr id="1" name="Image 1" descr="Picture" /><cNvPicPr /></nvPicPr><blipFill><a:blip cstate="print" r:embed="rId1" /><a:stretch><a:fillRect /></a:stretch></blipFill><spPr><a:prstGeom prst="rect" /></spPr></pic><clientData /></oneCellAnchor></wsDr>`,
    );
    zip.file(
      "xl/drawings/_rels/drawing1.xml.rels",
      `<Relationships xmlns="${PAQUETE}"><Relationship Type="${RELACION}/image" Target="/xl/media/image1.png" Id="rId1" /></Relationships>`,
    );
    zip.file("xl/media/image1.png", opciones.imagen);
  }
  if (opciones.tabla) {
    relaciones.push(
      `<Relationship Type="${RELACION}/table" Target="/xl/tables/table1.xml" Id="rId2" />`,
    );
    hoja = hoja.replace(
      "</worksheet>",
      '<tableParts count="1"><tablePart r:id="rId2"/></tableParts></worksheet>',
    );
    zip.file(
      "xl/tables/table1.xml",
      `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Alimentos" displayName="Alimentos" ref="A1:B3"><autoFilter ref="A1:B3"/><tableColumns count="2"><tableColumn id="1" name="Nombre"/><tableColumn id="2" name="Marca"/></tableColumns><tableStyleInfo name="TableStyleMedium9" showRowStripes="1"/></table>`,
    );
  }
  zip.file("xl/worksheets/sheet1.xml", hoja);
  zip.file(
    "xl/worksheets/_rels/sheet1.xml.rels",
    `<Relationships xmlns="${PAQUETE}">${relaciones.join("")}</Relationships>`,
  );
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

  it("lee una imagen anclada a dos celdas, como la guarda Excel", async () => {
    const { libro, hoja } = await modelo();
    type BufferExcel = Parameters<typeof libro.addImage>[0]["buffer"];
    const id = libro.addImage({
      buffer: (await png(10)) as unknown as BufferExcel,
      extension: "png",
    });
    // Un rango: <twoCellAnchor>, y no el <oneCellAnchor> que sale con `ext`.
    hoja.addImage(id, "L2:L2");

    const { imagenes } = await leer(libro);

    expect([...imagenes.keys()]).toEqual([0]);
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
      await planillaConImagenEnCelda(imagen, ["L3"]),
      "alimentos.xlsx",
    );

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
    expect(imagenes.has(0)).toBe(false);
    expect(imagenes.get(1)?.mimeType).toBe("image/png");
    expect(Buffer.from(imagenes.get(1)!.contenido)).toEqual(imagen);
  });

  it("en celda, la misma imagen en dos filas también comparte los bytes", async () => {
    const { imagenes } = await parsearPlanillaAlimentos(
      await planillaConImagenEnCelda(await png(99), ["L2", "L3"]),
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
      await planillaConImagenEnCelda(await png(99), ["L3"], {
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
      await planillaConImagenEnCelda(await png(99), ["L3"], {
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

// openpyxl guarda partes que Excel guarda de otra manera, todas válidas, y
// exceljs no abría la planilla: «Cannot read properties of undefined
// (reading 'anchors')», «'comments'» o «'name'», según lo que trajera.
describe("parsearPlanillaAlimentos: planillas armadas con openpyxl", () => {
  it("lee la imagen de un dibujo sin el prefijo xdr:", async () => {
    const imagen = await png(77);

    const { filas, imagenes } = await parsearPlanillaAlimentos(
      await planillaDeOpenpyxl({ imagen, fila: 3 }),
      "alimentos.xlsx",
    );

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
    expect([...imagenes.keys()]).toEqual([1]);
    expect(Buffer.from(imagenes.get(1)!.contenido)).toEqual(imagen);
  });

  it("abre una planilla con las notas en xl/comments/", async () => {
    const { filas, imagenes } = await parsearPlanillaAlimentos(
      await planillaDeOpenpyxl(),
      "alimentos.xlsx",
    );

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
    expect(imagenes.size).toBe(0);
  });

  it("abre una planilla con una tabla de ruta absoluta", async () => {
    const { filas } = await parsearPlanillaAlimentos(
      await planillaDeOpenpyxl({ tabla: true }),
      "alimentos.xlsx",
    );

    expect(filas.map((f) => f.nombre)).toEqual(["Arroz", "Pollo"]);
  });
});

describe("parsearPlanillaAlimentos — cafeína y descripción (migración 95)", () => {
  const csv = (texto: string) =>
    parsearPlanillaAlimentos(Buffer.from(texto, "utf-8"), "alimentos.csv");

  it("lee la cafeína (por 100) y la descripción", async () => {
    const { filas } = await csv(
      "Nombre;Carbohidratos;Cafeína (mg);Descripción\n" +
        "Gel;62,5;100;Tomar con agua\n" +
        "Arroz;28;;\n",
    );
    expect(filas[0]).toMatchObject({
      nombre: "Gel",
      cafeinaPor100: 100,
      descripcion: "Tomar con agua",
    });
    expect(filas[1]).toMatchObject({
      nombre: "Arroz",
      cafeinaPor100: null,
      descripcion: null,
    });
  });

  it("una columna «Descripción» no le gana a la de «Nombre», aunque venga antes", async () => {
    const { filas } = await csv(
      "Descripción;Nombre;Calorías\nBlanco, de grano largo;Arroz;130\n",
    );
    expect(filas[0]).toMatchObject({
      nombre: "Arroz",
      descripcion: "Blanco, de grano largo",
    });
  });

  it("sin columna de nombre, «Descripción» sigue siendo el nombre (planillas viejas)", async () => {
    const { filas } = await csv("Descripción;Calorías\nArroz;130\n");
    expect(filas[0]).toMatchObject({ nombre: "Arroz", descripcion: null });
  });
});

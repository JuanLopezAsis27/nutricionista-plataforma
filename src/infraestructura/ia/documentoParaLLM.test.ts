import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import {
  leerDocumentoParaLLM,
  ErrorDocumentoNoInterpretable,
} from "./documentoParaLLM";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function almacenamientoCon(contenido: Uint8Array): IAlmacenamientoArchivos {
  return {
    subir: vi.fn(async () => {}),
    generarUrlLectura: vi.fn(async () => "http://bucket/x"),
    descargar: vi.fn(async () => contenido),
    eliminar: vi.fn(async () => {}),
    listarClaves: vi.fn(async () => []),
  };
}

/** Arma un .docx real (es un zip con word/document.xml adentro). */
async function docxCon(parrafos: string[]): Promise<Uint8Array> {
  const cuerpo = parrafos
    .map((texto) => `<w:p><w:r><w:t>${texto}</w:t></w:r></w:p>`)
    .join("");
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpo}</w:body></w:document>`,
  );
  return await zip.generateAsync({ type: "uint8array" });
}

/** Arma un .xlsx real con una hoja cargada fila por fila. */
async function planillaCon(
  filas: readonly (readonly ExcelJS.CellValue[])[],
): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Evolución");
  for (const fila of filas) hoja.addRow([...fila]);
  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

describe("leerDocumentoParaLLM", () => {
  it("extrae el texto de un Word .docx", async () => {
    const docx = await docxCon([
      "Paciente: Ana Pérez",
      "Motivo de consulta: descenso de peso",
    ]);
    const bloque = await leerDocumentoParaLLM(almacenamientoCon(docx), {
      clave: "pacientes/ficha.docx",
      mimeType: MIME_DOCX,
    });

    expect(bloque.tipo).toBe("texto");
    expect(bloque).toMatchObject({
      texto: expect.stringContaining("Ana Pérez"),
    });
    expect(bloque).toMatchObject({
      texto: expect.stringContaining("descenso de peso"),
    });
  });

  it("manda el PDF tal cual, en base64, para que el modelo lo mire", async () => {
    // El PDF conserva la maquetación, y una ficha clínica suele ser una tabla:
    // pasarlo a texto plano pierde qué valor va con qué etiqueta.
    const bloque = await leerDocumentoParaLLM(
      almacenamientoCon(new Uint8Array([1, 2, 3])),
      { clave: "pacientes/ficha.pdf", mimeType: "application/pdf" },
    );

    expect(bloque).toEqual({
      tipo: "documento",
      mimeType: "application/pdf",
      base64: Buffer.from([1, 2, 3]).toString("base64"),
    });
  });

  it("manda una foto como imagen", async () => {
    const bloque = await leerDocumentoParaLLM(
      almacenamientoCon(new Uint8Array([9])),
      { clave: "pacientes/ficha.jpg", mimeType: "image/jpeg" },
    );

    expect(bloque).toMatchObject({ tipo: "imagen", mimeType: "image/jpeg" });
  });

  it("rechaza el .doc viejo explicando qué hacer", async () => {
    // El .doc binario anterior a 2007 no es un .docx renombrado: mandar sus
    // bytes al modelo devolvería campos inventados.
    await expect(
      leerDocumentoParaLLM(almacenamientoCon(new Uint8Array([1])), {
        clave: "pacientes/vieja.doc",
        mimeType: "application/msword",
      }),
    ).rejects.toThrow(/\.docx o PDF/);
  });

  it("rechaza un tipo que no sabe leer", async () => {
    await expect(
      leerDocumentoParaLLM(almacenamientoCon(new Uint8Array([1])), {
        clave: "x.zip",
        mimeType: "application/zip",
      }),
    ).rejects.toBeInstanceOf(ErrorDocumentoNoInterpretable);
  });

  it("serializa un Excel como grilla con la referencia de cada celda", async () => {
    // Sin las coordenadas el modelo no puede cruzar la fila de la medida con
    // la columna de la fecha, que es como se lee una planilla de evolución.
    const xlsx = await planillaCon([
      ["", new Date(Date.UTC(2024, 2, 15)), new Date(Date.UTC(2024, 3, 12))],
      ["Peso", 87.3, 84.7],
    ]);

    const bloque = await leerDocumentoParaLLM(almacenamientoCon(xlsx), {
      clave: "pacientes/evolucion.xlsx",
      mimeType: MIME_XLSX,
    });

    expect(bloque.tipo).toBe("texto");
    const texto = (bloque as { texto: string }).texto;
    expect(texto).toContain("B1: 2024-03-15");
    expect(texto).toContain("A2: Peso");
    expect(texto).toContain("B2: 87.3");
  });

  it("de una fórmula manda el resultado, no la fórmula", async () => {
    // La sumatoria de pliegues y los kg de grasa de la planilla del
    // profesional son fórmulas: pedirle al modelo que haga la cuenta es
    // exactamente lo que no se hace con datos clínicos.
    const xlsx = await planillaCon([
      ["Suma", { formula: "SUM(1,2)", result: 3 }],
    ]);

    const bloque = await leerDocumentoParaLLM(almacenamientoCon(xlsx), {
      clave: "pacientes/evolucion.xlsx",
      mimeType: MIME_XLSX,
    });

    const texto = (bloque as { texto: string }).texto;
    expect(texto).toContain("B1: 3");
    expect(texto).not.toContain("SUM");
  });

  it("rechaza el .xls viejo explicando qué hacer", async () => {
    await expect(
      leerDocumentoParaLLM(almacenamientoCon(new Uint8Array([1])), {
        clave: "pacientes/vieja.xls",
        mimeType: "application/vnd.ms-excel",
      }),
    ).rejects.toThrow(/\.xlsx/);
  });

  it("rechaza un Word sin texto (escaneado dentro del documento)", async () => {
    const vacio = await docxCon([]);

    await expect(
      leerDocumentoParaLLM(almacenamientoCon(vacio), {
        clave: "pacientes/escaneada.docx",
        mimeType: MIME_DOCX,
      }),
    ).rejects.toThrow(/no tiene texto legible/);
  });
});

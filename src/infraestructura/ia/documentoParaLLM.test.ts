import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  leerDocumentoParaLLM,
  ErrorDocumentoNoInterpretable,
} from "./documentoParaLLM";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIME_XLS = "application/vnd.ms-excel";

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

/** Arma un .xls real (BIFF8, Excel 97-2003), con una hoja por entrada. */
function xlsCon(hojas: Record<string, unknown[][]>): Uint8Array {
  const libro = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
  }
  const salida = XLSX.write(libro, {
    bookType: "biff8",
    type: "array",
  }) as ArrayBuffer;
  return new Uint8Array(salida);
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

  it("lee un Excel .xls (97-2003) igual que un .xlsx", async () => {
    // Las proformas de antropometría que circulan entre profesionales siguen
    // siendo .xls: rechazarlo obligaba a abrir cada una y guardarla de nuevo.
    const xls = xlsCon({ Evolución: [["Peso", 87.3]] });

    const bloque = await leerDocumentoParaLLM(almacenamientoCon(xls), {
      clave: "pacientes/vieja.xls",
      mimeType: MIME_XLS,
    });

    expect(bloque.tipo).toBe("texto");
    expect((bloque as { texto: string }).texto).toContain("B1: 87.3");
  });

  it("de la proforma de antropometría manda solo el primer cuadro de «Proc datos brutos»", async () => {
    // El resto del libro se calcula a partir de ese cuadro (masas, somatotipo,
    // la hoja de presentación) o son tablas de referencia por deporte:
    // mandarlo es darle al modelo números que no son medidas del paciente.
    const xls = xlsCon({
      "Proc datos brutos": [
        [
          "",
          "Deporte:",
          "Ninguno",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "CODIGO",
        ],
        ["Nombre:", "Ana Pérez"],
        ["Fecha:", "27/08/2026"],
        [
          "Variable",
          "serie 1",
          "serie 2",
          "serie 3",
          "serie 4",
          "serie 5",
          "mediana",
          "desvio std",
          "error %",
        ],
        ["DATOS BÁSICOS"],
        ["Peso Bruto (Kg)", 70.4, 70.6, 70.5, "", "", 70.5, 0.1, 0.14],
        [],
        ["Suma 6 pliegues:", 999],
      ],
      Presentación: [["Peso", 111]],
    });

    const bloque = await leerDocumentoParaLLM(almacenamientoCon(xls), {
      clave: "pacientes/antropogim.xls",
      mimeType: MIME_XLS,
    });

    const texto = (bloque as { texto: string }).texto;
    expect(texto).toContain("B2: Ana Pérez");
    expect(texto).toContain("G6: 70.5");
    // Lo que queda a la derecha del cuadro, lo que sigue al primer renglón
    // vacío y las otras hojas no viajan.
    expect(texto).not.toContain("CODIGO");
    expect(texto).not.toContain("999");
    expect(texto).not.toContain("Presentación");
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

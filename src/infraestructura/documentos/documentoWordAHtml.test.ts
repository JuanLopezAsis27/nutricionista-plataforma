import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { documentoWordAHtml, textoAHtml } from "./documentoWordAHtml";

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Arma un .docx real con el cuerpo dado (XML de WordprocessingML). */
async function docxCon(cuerpo: string): Promise<Uint8Array> {
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

const parrafo = (texto: string) => `<w:p><w:r><w:t>${texto}</w:t></w:r></w:p>`;
const celda = (texto: string) => `<w:tc>${parrafo(texto)}</w:tc>`;

describe("documentoWordAHtml", () => {
  it("convierte un .docx en una página con sus párrafos y sus tablas", async () => {
    // Un plan armado en Word casi siempre es una tabla por comida: sin la
    // tabla, la opción de desayuno queda suelta y no se sabe de qué franja es.
    const docx = await docxCon(
      parrafo("Plan de Ana") +
        `<w:tbl><w:tr>${celda("Desayuno")}${celda("Café con leche")}</w:tr></w:tbl>`,
    );

    const html = await documentoWordAHtml(docx, MIME_DOCX, "plan.docx");

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<title>plan.docx</title>");
    expect(html).toContain("Plan de Ana");
    expect(html).toMatch(
      /<table>[\s\S]*Desayuno[\s\S]*Café con leche[\s\S]*<\/table>/,
    );
  });

  it("escapa el título, que es el nombre con el que se subió el archivo", async () => {
    const html = await documentoWordAHtml(
      await docxCon(parrafo("x")),
      MIME_DOCX,
      '<img src=x onerror="alert(1)">.docx',
    );

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("textoAHtml (el texto de un .doc)", () => {
  it("cada línea es un párrafo, y el texto se escapa", () => {
    expect(textoAHtml("Hola <script>alert(1)</script>\n\nChau")).toBe(
      "<p>Hola &lt;script&gt;alert(1)&lt;/script&gt;</p>\n<p>Chau</p>",
    );
  });

  it("junta en una tabla las filas que terminan en tabulación", () => {
    expect(
      textoAHtml("Menú\nDesayuno\tCafé\t\nAlmuerzo\tEnsalada\t\nFin"),
    ).toBe(
      "<p>Menú</p>\n" +
        "<table><tr><td>Desayuno</td><td>Café</td></tr><tr><td>Almuerzo</td><td>Ensalada</td></tr></table>\n" +
        "<p>Fin</p>",
    );
  });

  it("una sangría con tabulación sigue siendo un párrafo", () => {
    expect(textoAHtml("\t- 1 taza de leche")).toBe(
      "<p>\t- 1 taza de leche</p>",
    );
  });
});

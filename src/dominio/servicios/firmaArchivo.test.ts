import { describe, it, expect } from "vitest";
import { contenidoCoincideConMime } from "./firmaArchivo";

const bytes = (...b: number[]) => new Uint8Array(b);
const texto = (s: string) => new TextEncoder().encode(s);

describe("contenidoCoincideConMime", () => {
  it("acepta un JPEG real declarado como JPEG", () => {
    expect(
      contenidoCoincideConMime(
        bytes(0xff, 0xd8, 0xff, 0xe0, 0x00),
        "image/jpeg",
      ),
    ).toBe(true);
  });

  it("acepta un PNG real declarado como PNG", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
    expect(contenidoCoincideConMime(png, "image/png")).toBe(true);
  });

  it("acepta un PDF real declarado como PDF", () => {
    expect(
      contenidoCoincideConMime(texto("%PDF-1.7\n..."), "application/pdf"),
    ).toBe(true);
  });

  it("acepta un WEBP real (contenedor RIFF con los bytes de tamaño variables)", () => {
    const webp = bytes(
      0x52,
      0x49,
      0x46,
      0x46, // RIFF
      0x24,
      0x00,
      0x00,
      0x00, // tamaño: cualquier valor
      0x57,
      0x45,
      0x42,
      0x50, // WEBP
    );
    expect(contenidoCoincideConMime(webp, "image/webp")).toBe(true);
  });

  it("acepta un .docx (que es un ZIP)", () => {
    const docx = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
    expect(
      contenidoCoincideConMime(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
  });

  // --- Lo que hay que frenar ------------------------------------------------

  it("rechaza HTML disfrazado de PNG (el ataque que motivó esto)", () => {
    const html = texto("<html><script>alert(document.cookie)</script></html>");
    expect(contenidoCoincideConMime(html, "image/png")).toBe(false);
  });

  it("rechaza HTML disfrazado de JPEG", () => {
    expect(
      contenidoCoincideConMime(texto("<svg onload=alert(1)>"), "image/jpeg"),
    ).toBe(false);
  });

  it("rechaza contenido cualquiera disfrazado de PDF", () => {
    expect(
      contenidoCoincideConMime(texto("no soy un pdf"), "application/pdf"),
    ).toBe(false);
  });

  it("rechaza un PNG declarado como JPEG (tipos cruzados)", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(contenidoCoincideConMime(png, "image/jpeg")).toBe(false);
  });

  it("rechaza un archivo más corto que la firma", () => {
    expect(contenidoCoincideConMime(bytes(0xff), "image/jpeg")).toBe(false);
    expect(contenidoCoincideConMime(new Uint8Array(), "application/pdf")).toBe(
      false,
    );
  });

  // --- Comportamiento ante tipos sin firma registrada -------------------------

  it("deja pasar un MIME del que no se tiene firma", () => {
    // La lista blanca de Archivo.crear es la que decide qué tipos se aceptan.
    // Esta función solo desmiente a los que sabe verificar, así que sumar un
    // tipo nuevo a la lista blanca no rompe las subidas por olvido.
    expect(contenidoCoincideConMime(texto("lo que sea"), "text/csv")).toBe(
      true,
    );
  });
});

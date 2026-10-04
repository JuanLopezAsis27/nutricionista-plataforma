import { describe, it, expect } from "vitest";
import { dibujaPdf } from "./soportePdf";

/**
 * La detección del visor de PDF del navegador.
 *
 * Existe por un error que se veía en producción: el plan en PDF no se abría «en
 * algunos celulares» y en su lugar salía el cartel de error del visor. La causa
 * es que Chrome en Android —y el WebView de la app— no traen visor embebido, y
 * el `<iframe>` no tiene forma de avisarlo (su `onError` es del elemento, y el
 * elemento carga bien).
 */
describe("dibujaPdf", () => {
  it("le cree a `pdfViewerEnabled` cuando el navegador la expone", () => {
    expect(dibujaPdf({ pdfViewerEnabled: true })).toBe(true);
  });

  it("Chrome en Android dice que NO, y es el caso que originó todo", () => {
    // Ahí `pdfViewerEnabled` es false aunque el resto sea Chrome completo: no
    // hay visor de PDF embebido en la plataforma.
    expect(
      dibujaPdf({
        pdfViewerEnabled: false,
        mimeTypes: { "application/pdf": {} },
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari",
      }),
    ).toBe(false);
  });

  it("iOS dice que NO aunque `pdfViewerEnabled` diga que sí", () => {
    // En un iframe dibuja solo la primera página y no deja pasar a las demás.
    const iphone = dibujaPdf({
      pdfViewerEnabled: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/604.1",
      maxTouchPoints: 5,
    });
    // El iPad se presenta como una Mac; lo delata la pantalla táctil.
    const ipad = dibujaPdf({
      pdfViewerEnabled: true,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1",
      maxTouchPoints: 5,
    });
    const mac = dibujaPdf({
      pdfViewerEnabled: true,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1",
      maxTouchPoints: 0,
    });

    expect(iphone).toBe(false);
    expect(ipad).toBe(false);
    expect(mac).toBe(true);
  });

  it("sin la propiedad, el registro de plugins contesta lo mismo", () => {
    expect(dibujaPdf({ mimeTypes: { "application/pdf": {} } })).toBe(true);
  });

  it("sin ninguna de las dos, decide por plataforma", () => {
    const escritorio = dibujaPdf({
      mimeTypes: {},
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    const telefono = dibujaPdf({
      mimeTypes: {},
      userAgent: "Mozilla/5.0 (Linux; Android 9; SM-J600G) Mobile",
    });
    const iphone = dibujaPdf({
      mimeTypes: {},
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    });

    expect(escritorio).toBe(true);
    expect(telefono).toBe(false);
    expect(iphone).toBe(false);
  });

  it("un navegador que no contesta nada no rompe la pregunta", () => {
    expect(dibujaPdf({})).toBe(true);
  });
});

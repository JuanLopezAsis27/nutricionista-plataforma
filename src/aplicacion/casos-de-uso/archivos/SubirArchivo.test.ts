import { describe, it, expect, vi } from "vitest";
import { SubirArchivo } from "./SubirArchivo";
import { ErrorArchivoInvalido } from "@/dominio/errores/ErrorArchivoInvalido";
import {
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
} from "../_ayudas-test";

/**
 * Contenidos con la firma binaria real de cada formato.
 *
 * Antes acá alcanzaba con `[1,2,3,4]`: el caso de uso confiaba en el MIME
 * declarado. Ahora se verifica la firma (ver servicios/firmaArchivo.ts), así
 * que los fixtures tienen que ser honestos sobre qué son.
 */
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe("SubirArchivo", () => {
  it("sube el objeto al bucket y persiste los metadatos", async () => {
    const archivos = mockArchivoRepositorio();
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new SubirArchivo(archivos, almacenamiento);

    const archivo = await casoUso.ejecutar({
      nombreOriginal: "analisis.pdf",
      mimeType: "application/pdf",
      contenido: PDF,
      contexto: "laboratorio",
    });

    expect(archivo.clave).toMatch(/^laboratorios\/.+\.pdf$/);
    expect(archivo.tamanoBytes).toBe(PDF.byteLength);
    expect(almacenamiento.subir).toHaveBeenCalledWith(
      archivo.clave,
      PDF,
      "application/pdf",
    );
    expect(archivos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un MIME no permitido para el contexto", async () => {
    const casoUso = new SubirArchivo(
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "video.mp4",
        mimeType: "video/mp4",
        contenido: JPEG,
        contexto: "foto-comida",
      }),
    ).rejects.toBeInstanceOf(ErrorArchivoInvalido);
  });

  it("rechaza un archivo que supera el tamaño máximo del contexto", async () => {
    const casoUso = new SubirArchivo(
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    const gigante = new Uint8Array(11 * 1024 * 1024);
    gigante.set(JPEG, 0); // firma válida: lo que debe fallar es el tamaño

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "foto.jpg",
        mimeType: "image/jpeg",
        contenido: gigante,
        contexto: "receta",
      }),
    ).rejects.toBeInstanceOf(ErrorArchivoInvalido);
  });

  it("compensa borrando del bucket si falla la persistencia", async () => {
    const archivos = mockArchivoRepositorio({
      crear: vi.fn(async () => {
        throw new Error("falló la base");
      }),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new SubirArchivo(archivos, almacenamiento);

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "foto.png",
        mimeType: "image/png",
        contenido: PNG,
        contexto: "receta",
      }),
    ).rejects.toThrow("falló la base");

    expect(almacenamiento.eliminar).toHaveBeenCalledOnce();
  });

  // --- Verificación de firma binaria -----------------------------------------

  it("rechaza contenido que no se corresponde con el MIME declarado", async () => {
    const archivos = mockArchivoRepositorio();
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new SubirArchivo(archivos, almacenamiento);

    // HTML con un script, declarado como PNG: es el ataque que se quiere frenar.
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "foto.png",
        mimeType: "image/png",
        contenido: html,
        contexto: "foto-comida",
      }),
    ).rejects.toBeInstanceOf(ErrorArchivoInvalido);
  });

  it("no escribe nada en el bucket si el contenido miente sobre su tipo", async () => {
    const archivos = mockArchivoRepositorio();
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new SubirArchivo(archivos, almacenamiento);

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "plan.pdf",
        mimeType: "application/pdf",
        contenido: new TextEncoder().encode("no soy un pdf"),
        contexto: "plan",
      }),
    ).rejects.toBeInstanceOf(ErrorArchivoInvalido);

    expect(almacenamiento.subir).not.toHaveBeenCalled();
    expect(archivos.crear).not.toHaveBeenCalled();
  });

  it("acepta un JPEG real declarado como JPEG", async () => {
    const casoUso = new SubirArchivo(
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    const archivo = await casoUso.ejecutar({
      nombreOriginal: "comida.jpg",
      mimeType: "image/jpeg",
      contenido: JPEG,
      contexto: "foto-comida",
    });

    expect(archivo.mimeType).toBe("image/jpeg");
  });
});

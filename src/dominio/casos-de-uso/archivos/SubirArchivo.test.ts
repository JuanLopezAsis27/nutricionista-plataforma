import { describe, it, expect, vi } from "vitest";
import { SubirArchivo } from "./SubirArchivo";
import { ErrorArchivoInvalido } from "../../errores/ErrorArchivoInvalido";
import { mockArchivoRepositorio, mockAlmacenamientoArchivos } from "../_ayudas-test";

const CONTENIDO = new Uint8Array([1, 2, 3, 4]);

describe("SubirArchivo", () => {
  it("sube el objeto al bucket y persiste los metadatos", async () => {
    const archivos = mockArchivoRepositorio();
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new SubirArchivo(archivos, almacenamiento);

    const archivo = await casoUso.ejecutar({
      nombreOriginal: "analisis.pdf",
      mimeType: "application/pdf",
      contenido: CONTENIDO,
      contexto: "laboratorio",
    });

    expect(archivo.clave).toMatch(/^laboratorios\/.+\.pdf$/);
    expect(archivo.tamanoBytes).toBe(4);
    expect(almacenamiento.subir).toHaveBeenCalledWith(
      archivo.clave,
      CONTENIDO,
      "application/pdf",
    );
    expect(archivos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un MIME no permitido para el contexto", async () => {
    const casoUso = new SubirArchivo(mockArchivoRepositorio(), mockAlmacenamientoArchivos());

    await expect(
      casoUso.ejecutar({
        nombreOriginal: "video.mp4",
        mimeType: "video/mp4",
        contenido: CONTENIDO,
        contexto: "foto-comida",
      }),
    ).rejects.toBeInstanceOf(ErrorArchivoInvalido);
  });

  it("rechaza un archivo que supera el tamaño máximo del contexto", async () => {
    const casoUso = new SubirArchivo(mockArchivoRepositorio(), mockAlmacenamientoArchivos());
    const gigante = new Uint8Array(11 * 1024 * 1024);

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
        contenido: CONTENIDO,
        contexto: "receta",
      }),
    ).rejects.toThrow("falló la base");

    expect(almacenamiento.eliminar).toHaveBeenCalledOnce();
  });
});

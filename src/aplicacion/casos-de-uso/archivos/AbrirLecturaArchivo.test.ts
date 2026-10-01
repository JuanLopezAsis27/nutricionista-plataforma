import { describe, it, expect, vi } from "vitest";
import { AbrirLecturaArchivo } from "./AbrirLecturaArchivo";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import {
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

describe("AbrirLecturaArchivo", () => {
  it("abre el objeto del bucket por la clave del archivo", async () => {
    const archivo = archivoEjemplo();
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivo),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new AbrirLecturaArchivo(archivos, almacenamiento);

    const resultado = await casoUso.ejecutar("arc-1");

    expect(resultado.archivo).toBe(archivo);
    expect(resultado.lectura.contenido).toBeInstanceOf(ReadableStream);
    expect(almacenamiento.abrirLectura).toHaveBeenCalledWith(archivo.clave);
  });

  it("no toca el bucket si el archivo no existe", async () => {
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new AbrirLecturaArchivo(
      mockArchivoRepositorio(),
      almacenamiento,
    );

    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorArchivoNoEncontrado,
    );
    expect(almacenamiento.abrirLectura).not.toHaveBeenCalled();
  });
});

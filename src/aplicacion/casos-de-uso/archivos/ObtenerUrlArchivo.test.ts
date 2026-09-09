import { describe, it, expect, vi } from "vitest";
import { ObtenerUrlArchivo } from "./ObtenerUrlArchivo";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import {
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

describe("ObtenerUrlArchivo", () => {
  it("devuelve el archivo con su URL firmada", async () => {
    const archivo = archivoEjemplo();
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivo),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new ObtenerUrlArchivo(archivos, almacenamiento);

    const resultado = await casoUso.ejecutar("arc-1", 120);

    expect(resultado.archivo).toBe(archivo);
    expect(resultado.url).toContain(archivo.clave);
    expect(almacenamiento.generarUrlLectura).toHaveBeenCalledWith(
      archivo.clave,
      120,
    );
  });

  it("lanza ErrorArchivoNoEncontrado si el archivo no existe", async () => {
    const casoUso = new ObtenerUrlArchivo(
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorArchivoNoEncontrado,
    );
  });
});

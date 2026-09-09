import { describe, it, expect, vi } from "vitest";
import { ObtenerContenidoArchivo } from "./ObtenerContenidoArchivo";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import {
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

describe("ObtenerContenidoArchivo", () => {
  it("devuelve el archivo con su contenido, bajado por la clave del bucket", async () => {
    const archivo = archivoEjemplo();
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivo),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new ObtenerContenidoArchivo(archivos, almacenamiento);

    const resultado = await casoUso.ejecutar("arc-1");

    expect(resultado.archivo).toBe(archivo);
    expect(resultado.contenido).toBeInstanceOf(Uint8Array);
    expect(almacenamiento.descargar).toHaveBeenCalledWith(archivo.clave);
  });

  it("no toca el bucket si el archivo no existe", async () => {
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new ObtenerContenidoArchivo(
      mockArchivoRepositorio(),
      almacenamiento,
    );

    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorArchivoNoEncontrado,
    );
    expect(almacenamiento.descargar).not.toHaveBeenCalled();
  });
});

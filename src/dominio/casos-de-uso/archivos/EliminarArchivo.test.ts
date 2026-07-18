import { describe, it, expect, vi } from "vitest";
import { EliminarArchivo } from "./EliminarArchivo";
import { ErrorArchivoNoEncontrado } from "../../errores/ErrorArchivoNoEncontrado";
import {
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
} from "../_ayudas-test";

describe("EliminarArchivo", () => {
  it("elimina la fila y el objeto del bucket", async () => {
    const archivo = archivoEjemplo();
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivo),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarArchivo(archivos, almacenamiento);

    await casoUso.ejecutar("arc-1");

    expect(archivos.eliminar).toHaveBeenCalledWith("arc-1");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(archivo.clave);
  });

  it("lanza ErrorArchivoNoEncontrado si no existe", async () => {
    const casoUso = new EliminarArchivo(
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );

    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorArchivoNoEncontrado,
    );
  });
});

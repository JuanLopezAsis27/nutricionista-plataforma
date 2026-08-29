import { describe, it, expect, vi } from "vitest";
import { EliminarReceta } from "./EliminarReceta";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";
import {
  mockRecetaRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  recetaEjemplo,
  archivoEjemplo,
} from "../_ayudas-test";

describe("EliminarReceta", () => {
  it("elimina la receta y borra sus fotos del bucket", async () => {
    const foto = archivoEjemplo(
      { contexto: "receta", mimeType: "image/jpeg" },
      "arc-1",
    );
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const archivos = mockArchivoRepositorio({
      listarPorDueno: vi.fn(async () => [foto]),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarReceta(recetas, archivos, almacenamiento);

    await casoUso.ejecutar("rec-1");

    expect(recetas.eliminar).toHaveBeenCalledWith("rec-1");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(foto.clave);
  });

  it("lanza ErrorRecetaNoEncontrada si no existe", async () => {
    const recetas = mockRecetaRepositorio();
    const archivos = mockArchivoRepositorio();
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarReceta(recetas, archivos, almacenamiento);

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorRecetaNoEncontrada,
    );
    expect(recetas.eliminar).not.toHaveBeenCalled();
  });
});

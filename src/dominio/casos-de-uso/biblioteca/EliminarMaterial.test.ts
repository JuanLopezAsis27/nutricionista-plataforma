import { describe, it, expect, vi } from "vitest";
import { EliminarMaterial } from "./EliminarMaterial";
import { ErrorMaterialNoEncontrado } from "../../errores/ErrorMaterialNoEncontrado";
import {
  mockMaterialRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  materialEjemplo,
  archivoEjemplo,
} from "../_ayudas-test";

describe("EliminarMaterial", () => {
  it("elimina el material y borra su archivo del bucket", async () => {
    const adjunto = archivoEjemplo({ contexto: "biblioteca" }, "arc-1");
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const archivos = mockArchivoRepositorio({
      listarPorDueno: vi.fn(async () => [adjunto]),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarMaterial(materiales, archivos, almacenamiento);

    await casoUso.ejecutar("mat-1");

    expect(materiales.eliminar).toHaveBeenCalledWith("mat-1");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(adjunto.clave);
  });

  it("lanza ErrorMaterialNoEncontrado si no existe", async () => {
    const casoUso = new EliminarMaterial(
      mockMaterialRepositorio(),
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    await expect(casoUso.ejecutar("nada")).rejects.toBeInstanceOf(
      ErrorMaterialNoEncontrado,
    );
  });
});

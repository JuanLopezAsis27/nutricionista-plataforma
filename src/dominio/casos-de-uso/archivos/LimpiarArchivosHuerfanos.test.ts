import { describe, it, expect, vi } from "vitest";
import { LimpiarArchivosHuerfanos } from "./LimpiarArchivosHuerfanos";
import { mockArchivoRepositorio, mockAlmacenamientoArchivos } from "../_ayudas-test";

describe("LimpiarArchivosHuerfanos", () => {
  it("elimina del bucket solo los objetos sin fila de metadatos", async () => {
    const archivos = mockArchivoRepositorio({
      listarClaves: vi.fn(async () => ["recetas/a.jpg", "laboratorios/b.pdf"]),
    });
    const almacenamiento = mockAlmacenamientoArchivos({
      listarClaves: vi.fn(async () => [
        "recetas/a.jpg",
        "laboratorios/b.pdf",
        "recetas/huerfano.jpg",
      ]),
    });
    const casoUso = new LimpiarArchivosHuerfanos(archivos, almacenamiento);

    const resultado = await casoUso.ejecutar();

    expect(resultado.objetosEliminados).toBe(1);
    expect(almacenamiento.eliminar).toHaveBeenCalledOnce();
    expect(almacenamiento.eliminar).toHaveBeenCalledWith("recetas/huerfano.jpg");
  });

  it("no elimina nada cuando bucket y base coinciden", async () => {
    const archivos = mockArchivoRepositorio({
      listarClaves: vi.fn(async () => ["recetas/a.jpg"]),
    });
    const almacenamiento = mockAlmacenamientoArchivos({
      listarClaves: vi.fn(async () => ["recetas/a.jpg"]),
    });
    const casoUso = new LimpiarArchivosHuerfanos(archivos, almacenamiento);

    const resultado = await casoUso.ejecutar();

    expect(resultado.objetosEliminados).toBe(0);
    expect(almacenamiento.eliminar).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { EliminarPlantilla } from "./EliminarPlantilla";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import { mockPlantillaEmailRepositorio, plantillaEmailEjemplo } from "../_ayudas-test";

describe("EliminarPlantilla", () => {
  it("elimina una plantilla no-sistema", async () => {
    const eliminar = vi.fn(async () => {});
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorId: vi.fn(async () => plantillaEmailEjemplo({ deSistema: false }, "pla-2")),
      eliminar,
    });

    await new EliminarPlantilla(repo).ejecutar("pla-2");

    expect(eliminar).toHaveBeenCalledWith("pla-2");
  });

  it("rechaza eliminar una plantilla de sistema", async () => {
    const eliminar = vi.fn(async () => {});
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorId: vi.fn(async () => plantillaEmailEjemplo({ deSistema: true })),
      eliminar,
    });

    await expect(new EliminarPlantilla(repo).ejecutar("pla-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(eliminar).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlantillaNoEncontrada si no existe", async () => {
    const repo = mockPlantillaEmailRepositorio({ obtenerPorId: vi.fn(async () => null) });
    await expect(new EliminarPlantilla(repo).ejecutar("x")).rejects.toBeInstanceOf(
      ErrorPlantillaNoEncontrada,
    );
  });
});

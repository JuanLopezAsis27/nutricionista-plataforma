import { describe, it, expect, vi } from "vitest";
import { EliminarObjetivo } from "./EliminarObjetivo";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

describe("EliminarObjetivo", () => {
  it("elimina un objetivo existente", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new EliminarObjetivo(objetivos);

    await casoUso.ejecutar("obj-1");
    expect(objetivos.eliminar).toHaveBeenCalledWith("obj-1");
  });

  it("lanza ErrorObjetivoNoEncontrado si no existe", async () => {
    const casoUso = new EliminarObjetivo(mockObjetivoRepositorio());
    await expect(casoUso.ejecutar("nada")).rejects.toBeInstanceOf(
      ErrorObjetivoNoEncontrado,
    );
  });
});

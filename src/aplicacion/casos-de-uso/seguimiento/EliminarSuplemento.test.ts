import { describe, it, expect, vi } from "vitest";
import { EliminarSuplemento } from "./EliminarSuplemento";
import { ErrorSuplementoNoEncontrado } from "@/dominio/errores/ErrorSuplementoNoEncontrado";
import { mockSuplementoRepositorio, suplementoEjemplo } from "../_ayudas-test";

describe("EliminarSuplemento", () => {
  it("elimina un suplemento existente", async () => {
    const suplementos = mockSuplementoRepositorio({
      obtenerPorId: vi.fn(async () => suplementoEjemplo()),
    });
    const casoUso = new EliminarSuplemento(suplementos);

    await casoUso.ejecutar("sup-1");
    expect(suplementos.eliminar).toHaveBeenCalledWith("sup-1");
  });

  it("lanza ErrorSuplementoNoEncontrado si no existe", async () => {
    const casoUso = new EliminarSuplemento(mockSuplementoRepositorio());
    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorSuplementoNoEncontrado,
    );
  });
});

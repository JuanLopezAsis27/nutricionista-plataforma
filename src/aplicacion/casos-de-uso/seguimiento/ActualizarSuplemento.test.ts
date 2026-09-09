import { describe, it, expect, vi } from "vitest";
import { ActualizarSuplemento } from "./ActualizarSuplemento";
import { ErrorSuplementoNoEncontrado } from "@/dominio/errores/ErrorSuplementoNoEncontrado";
import { mockSuplementoRepositorio, suplementoEjemplo } from "../_ayudas-test";

describe("ActualizarSuplemento", () => {
  it("actualiza y permite finalizar con activo=false", async () => {
    const suplementos = mockSuplementoRepositorio({
      obtenerPorId: vi.fn(async () => suplementoEjemplo()),
    });
    const casoUso = new ActualizarSuplemento(suplementos);

    const suplemento = await casoUso.ejecutar({
      id: "sup-1",
      nombre: "Creatina monohidrato",
      activo: false,
    });

    expect(suplemento.activo).toBe(false);
    expect(suplemento.aPrimitivos().pacienteId).toBe("pac-1"); // preservado
    expect(suplementos.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorSuplementoNoEncontrado si no existe", async () => {
    const casoUso = new ActualizarSuplemento(mockSuplementoRepositorio());
    await expect(
      casoUso.ejecutar({ id: "inexistente", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorSuplementoNoEncontrado);
  });
});

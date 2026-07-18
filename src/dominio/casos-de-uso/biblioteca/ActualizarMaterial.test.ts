import { describe, it, expect, vi } from "vitest";
import { ActualizarMaterial } from "./ActualizarMaterial";
import { ErrorMaterialNoEncontrado } from "../../errores/ErrorMaterialNoEncontrado";
import { mockMaterialRepositorio, materialEjemplo } from "../_ayudas-test";

describe("ActualizarMaterial", () => {
  it("actualiza los metadatos preservando el tipo", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const casoUso = new ActualizarMaterial(materiales);

    const material = await casoUso.ejecutar({
      id: "mat-1",
      titulo: "Guía de porciones v2",
      etiquetas: ["porciones", "educación"],
    });

    const datos = material.aPrimitivos();
    expect(datos.titulo).toBe("Guía de porciones v2");
    expect(datos.tipo).toBe("ENLACE"); // preservado
    expect(materiales.actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorMaterialNoEncontrado si no existe", async () => {
    const casoUso = new ActualizarMaterial(mockMaterialRepositorio());
    await expect(casoUso.ejecutar({ id: "nada", titulo: "X" })).rejects.toBeInstanceOf(
      ErrorMaterialNoEncontrado,
    );
  });
});

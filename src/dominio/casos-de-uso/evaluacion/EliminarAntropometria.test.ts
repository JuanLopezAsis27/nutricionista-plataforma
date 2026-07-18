import { describe, it, expect, vi } from "vitest";
import { EliminarAntropometria } from "./EliminarAntropometria";
import { ErrorAntropometriaNoEncontrada } from "../../errores/ErrorAntropometriaNoEncontrada";
import { mockAntropometriaRepositorio, antropometriaEjemplo } from "../_ayudas-test";

describe("EliminarAntropometria", () => {
  it("elimina la medición existente", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      obtenerPorId: vi.fn(async () => antropometriaEjemplo()),
    });
    const casoUso = new EliminarAntropometria(antropometrias);

    await casoUso.ejecutar("ant-1");

    expect(antropometrias.eliminar).toHaveBeenCalledWith("ant-1");
  });

  it("rechaza si la medición no existe", async () => {
    const casoUso = new EliminarAntropometria(mockAntropometriaRepositorio());
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorAntropometriaNoEncontrada,
    );
  });
});

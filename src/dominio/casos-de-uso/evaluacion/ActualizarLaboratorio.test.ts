import { describe, it, expect, vi } from "vitest";
import { ActualizarLaboratorio } from "./ActualizarLaboratorio";
import { ErrorLaboratorioNoEncontrado } from "../../errores/ErrorLaboratorioNoEncontrado";
import {
  mockLaboratorioRepositorio,
  laboratorioEjemplo,
} from "../_ayudas-test";

describe("ActualizarLaboratorio", () => {
  it("actualiza los datos y vincula los archivos nuevos", async () => {
    const laboratorios = mockLaboratorioRepositorio({
      obtenerPorId: vi.fn(async () => laboratorioEjemplo()),
    });
    const casoUso = new ActualizarLaboratorio(laboratorios);

    const laboratorio = await casoUso.ejecutar("lab-1", {
      titulo: "Perfil tiroideo",
      archivoIdsNuevos: ["arc-9"],
    });

    expect(laboratorio.titulo).toBe("Perfil tiroideo");
    expect(laboratorios.actualizar).toHaveBeenCalledWith(expect.anything(), [
      "arc-9",
    ]);
  });

  it("rechaza si el laboratorio no existe", async () => {
    const casoUso = new ActualizarLaboratorio(mockLaboratorioRepositorio());
    await expect(
      casoUso.ejecutar("no-existe", { titulo: "x" }),
    ).rejects.toBeInstanceOf(ErrorLaboratorioNoEncontrado);
  });
});

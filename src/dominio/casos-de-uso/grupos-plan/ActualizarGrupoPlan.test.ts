import { describe, it, expect, vi } from "vitest";
import { ActualizarGrupoPlan } from "./ActualizarGrupoPlan";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";
import { ErrorGrupoPlanDuplicado } from "../../errores/ErrorGrupoPlanDuplicado";
import { mockGrupoPlanRepositorio, grupoPlanEjemplo } from "../_ayudas-test";

describe("ActualizarGrupoPlan", () => {
  it("renombra la carpeta", async () => {
    const grupos = mockGrupoPlanRepositorio({
      obtenerPorId: vi.fn(async () => grupoPlanEjemplo()),
    });
    const casoUso = new ActualizarGrupoPlan(grupos);

    const grupo = await casoUso.ejecutar({ id: "gru-1", nombre: "Julia P." });

    expect(grupo.nombre).toBe("Julia P.");
    expect(grupos.actualizar).toHaveBeenCalledOnce();
  });

  it("se excluye a sí misma al buscar duplicados", async () => {
    const grupos = mockGrupoPlanRepositorio({
      obtenerPorId: vi.fn(async () => grupoPlanEjemplo()),
    });
    const casoUso = new ActualizarGrupoPlan(grupos);

    await casoUso.ejecutar({
      id: "gru-1",
      nombre: "Julia Pérez",
      descripcion: "Nueva",
    });

    // Sin `excluirId`, editar la descripción chocaría con su propio nombre.
    expect(grupos.existeNombre).toHaveBeenCalledWith("Julia Pérez", "gru-1");
  });

  it("rechaza renombrarla a un nombre ya usado", async () => {
    const grupos = mockGrupoPlanRepositorio({
      obtenerPorId: vi.fn(async () => grupoPlanEjemplo()),
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new ActualizarGrupoPlan(grupos);

    await expect(
      casoUso.ejecutar({ id: "gru-1", nombre: "Deportistas" }),
    ).rejects.toBeInstanceOf(ErrorGrupoPlanDuplicado);
    expect(grupos.actualizar).not.toHaveBeenCalled();
  });

  it("lanza ErrorGrupoPlanNoEncontrado si la carpeta no existe", async () => {
    const grupos = mockGrupoPlanRepositorio();
    const casoUso = new ActualizarGrupoPlan(grupos);

    await expect(
      casoUso.ejecutar({ id: "gru-x", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorGrupoPlanNoEncontrado);
  });
});

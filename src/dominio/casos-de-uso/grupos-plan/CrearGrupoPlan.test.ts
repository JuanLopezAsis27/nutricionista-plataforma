import { describe, it, expect, vi } from "vitest";
import { CrearGrupoPlan } from "./CrearGrupoPlan";
import { GrupoPlan } from "../../entidades/GrupoPlan";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { ErrorGrupoPlanDuplicado } from "../../errores/ErrorGrupoPlanDuplicado";
import { mockGrupoPlanRepositorio } from "../_ayudas-test";

describe("CrearGrupoPlan", () => {
  it("crea la carpeta cuando el nombre está libre", async () => {
    const grupos = mockGrupoPlanRepositorio();
    const casoUso = new CrearGrupoPlan(grupos);

    const grupo = await casoUso.ejecutar({ nombre: "Deportistas" });

    expect(grupo).toBeInstanceOf(GrupoPlan);
    expect(grupo.nombre).toBe("Deportistas");
    expect(grupos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un nombre que ya está en uso", async () => {
    const grupos = mockGrupoPlanRepositorio({ existeNombre: vi.fn(async () => true) });
    const casoUso = new CrearGrupoPlan(grupos);

    await expect(casoUso.ejecutar({ nombre: "Deportistas" })).rejects.toBeInstanceOf(
      ErrorGrupoPlanDuplicado,
    );
    expect(grupos.crear).not.toHaveBeenCalled();
  });

  it("rechaza una carpeta sin nombre", async () => {
    const grupos = mockGrupoPlanRepositorio();
    const casoUso = new CrearGrupoPlan(grupos);

    await expect(casoUso.ejecutar({ nombre: "   " })).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(grupos.crear).not.toHaveBeenCalled();
  });
});

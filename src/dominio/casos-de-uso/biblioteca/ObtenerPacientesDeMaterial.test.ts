import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientesDeMaterial } from "./ObtenerPacientesDeMaterial";
import { mockMaterialRepositorio } from "../_ayudas-test";

describe("ObtenerPacientesDeMaterial", () => {
  it("devuelve los ids de pacientes con el material asignado", async () => {
    const materiales = mockMaterialRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1", "pac-2"]),
    });
    const casoUso = new ObtenerPacientesDeMaterial(materiales);

    const resultado = await casoUso.ejecutar("mat-1");

    expect(resultado).toEqual(["pac-1", "pac-2"]);
    expect(materiales.listarPacientesAsignados).toHaveBeenCalledWith("mat-1");
  });
});

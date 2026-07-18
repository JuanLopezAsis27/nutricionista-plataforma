import { describe, it, expect } from "vitest";
import { DesasignarMaterialDePaciente } from "./DesasignarMaterialDePaciente";
import { mockMaterialRepositorio } from "../_ayudas-test";

describe("DesasignarMaterialDePaciente", () => {
  it("deja de compartir el material con el paciente", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new DesasignarMaterialDePaciente(materiales);

    await casoUso.ejecutar({ materialId: "mat-1", pacienteId: "pac-1" });

    expect(materiales.desasignarDePaciente).toHaveBeenCalledWith("mat-1", "pac-1");
  });
});

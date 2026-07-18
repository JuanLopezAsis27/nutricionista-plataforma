import { describe, it, expect } from "vitest";
import { DesasignarRecetaDePaciente } from "./DesasignarRecetaDePaciente";
import { mockRecetaRepositorio } from "../_ayudas-test";

describe("DesasignarRecetaDePaciente", () => {
  it("deja de compartir la receta con el paciente", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new DesasignarRecetaDePaciente(recetas);

    await casoUso.ejecutar({ recetaId: "rec-1", pacienteId: "pac-1" });

    expect(recetas.desasignarDePaciente).toHaveBeenCalledWith("rec-1", "pac-1");
  });
});

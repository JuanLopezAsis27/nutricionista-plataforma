import { describe, it, expect } from "vitest";
import { DesasignarPlanDePaciente } from "./DesasignarPlanDePaciente";
import { mockPlanRepositorio } from "../_ayudas-test";

describe("DesasignarPlanDePaciente", () => {
  it("desactiva las asignaciones activas del paciente", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new DesasignarPlanDePaciente(planes);

    await casoUso.ejecutar("pac-1");

    expect(planes.desactivarAsignacionesDe).toHaveBeenCalledWith("pac-1");
  });
});

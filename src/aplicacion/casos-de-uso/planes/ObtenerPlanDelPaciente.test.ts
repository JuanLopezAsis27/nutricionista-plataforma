import { describe, it, expect, vi } from "vitest";
import { ObtenerPlanDelPaciente } from "./ObtenerPlanDelPaciente";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ObtenerPlanDelPaciente", () => {
  it("devuelve el plan activo del paciente", async () => {
    const planes = mockPlanRepositorio({
      obtenerPlanActivoDePaciente: vi.fn(async () => planEjemplo()),
    });
    const casoUso = new ObtenerPlanDelPaciente(planes);

    const plan = await casoUso.ejecutar("pac-1");

    expect(plan?.id).toBe("pla-1");
    expect(planes.obtenerPlanActivoDePaciente).toHaveBeenCalledWith("pac-1");
  });

  it("devuelve null si el paciente no tiene plan activo", async () => {
    const casoUso = new ObtenerPlanDelPaciente(mockPlanRepositorio());
    expect(await casoUso.ejecutar("pac-1")).toBeNull();
  });
});

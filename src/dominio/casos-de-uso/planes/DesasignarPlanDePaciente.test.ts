import { describe, it, expect } from "vitest";
import { DesasignarPlanDePaciente } from "./DesasignarPlanDePaciente";
import { mockPlanRepositorio } from "../_ayudas-test";

describe("DesasignarPlanDePaciente", () => {
  it("cierra las asignaciones activas dejando la fecha de fin", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new DesasignarPlanDePaciente(planes);
    const hoy = new Date("2026-08-29");

    await casoUso.ejecutar("pac-1", hoy);

    // La fecha viaja al repositorio: sin ella el historial diría que el plan
    // terminó, pero no cuándo.
    expect(planes.desactivarAsignacionesDe).toHaveBeenCalledWith("pac-1", hoy);
  });
});

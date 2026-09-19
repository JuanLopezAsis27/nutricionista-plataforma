import { describe, it, expect } from "vitest";
import { DesasignarPlanDePaciente } from "./DesasignarPlanDePaciente";
import { mockAsignacionPlanRepositorio } from "../_ayudas-test";

describe("DesasignarPlanDePaciente", () => {
  it("saca del paciente el plan que se nombra, con la fecha", async () => {
    const asignaciones = mockAsignacionPlanRepositorio();
    const casoUso = new DesasignarPlanDePaciente(asignaciones);
    const hoy = new Date("2026-08-29T10:00:00.000Z");

    await casoUso.ejecutar({ planId: "pla-1", pacienteId: "pac-1" }, hoy);

    // El plan viaja al repositorio porque el paciente puede tener varios:
    // "sacarle el plan" sin decir cuál dejó de significar algo. La fecha viaja
    // porque el registro de que lo tuvo se guarda aunque no se muestre: sin
    // ella diría que dejó de tenerlo, pero no cuándo.
    expect(asignaciones.desasignarDePaciente).toHaveBeenCalledWith(
      "pla-1",
      "pac-1",
      hoy,
    );
  });
});

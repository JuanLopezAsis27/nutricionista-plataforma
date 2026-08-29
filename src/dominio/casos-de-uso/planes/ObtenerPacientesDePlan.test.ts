import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientesDePlan } from "./ObtenerPacientesDePlan";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

const asignacion = {
  id: "asig-1",
  planId: "pla-1",
  nombrePlan: "Plan descenso",
  pacienteId: "pac-1",
  pacienteNombre: "Julia",
  pacienteApellido: "Pérez",
  fechaInicio: new Date("2026-07-01"),
  fechaFin: null,
  finalizadaEn: null,
  activa: true,
};

describe("ObtenerPacientesDePlan", () => {
  it("devuelve las asignaciones del plan, activas e históricas", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
      listarAsignacionesDePlan: vi.fn(async () => [
        asignacion,
        {
          ...asignacion,
          id: "asig-2",
          activa: false,
          finalizadaEn: new Date("2026-06-01"),
        },
      ]),
    });
    const casoUso = new ObtenerPacientesDePlan(planes);

    const resultado = await casoUso.ejecutar("pla-1");

    // Las históricas también: un plan que se usó y se dejó sigue siendo usado.
    expect(resultado).toHaveLength(2);
    expect(resultado[0]!.pacienteNombre).toBe("Julia");
  });

  it("lanza ErrorPlanNoEncontrado si el plan no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ObtenerPacientesDePlan(planes);

    await expect(casoUso.ejecutar("pla-x")).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
    expect(planes.listarAsignacionesDePlan).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { EliminarPlan } from "./EliminarPlan";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("EliminarPlan", () => {
  it("elimina un plan sin asignaciones activas", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const casoUso = new EliminarPlan(planes);

    await casoUso.ejecutar("pla-1");
    expect(planes.eliminar).toHaveBeenCalledWith("pla-1");
  });

  it("rechaza eliminar un plan con asignaciones activas", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
      contarAsignacionesActivasDePlan: vi.fn(async () => 2),
    });
    const casoUso = new EliminarPlan(planes);

    await expect(casoUso.ejecutar("pla-1")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.eliminar).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlanNoEncontrado si no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new EliminarPlan(planes);

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

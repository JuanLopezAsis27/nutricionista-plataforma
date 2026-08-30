import { describe, it, expect, vi } from "vitest";
import { ObtenerPlanPorId } from "./ObtenerPlanPorId";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ObtenerPlanPorId", () => {
  it("devuelve el plan cuando existe", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const casoUso = new ObtenerPlanPorId(planes);

    const plan = await casoUso.ejecutar("pla-1");
    expect(plan.id).toBe("pla-1");
  });

  it("lanza ErrorPlanNoEncontrado si no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ObtenerPlanPorId(planes);

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

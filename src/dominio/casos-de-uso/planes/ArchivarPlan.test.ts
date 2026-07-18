import { describe, it, expect, vi } from "vitest";
import { ArchivarPlan } from "./ArchivarPlan";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ArchivarPlan", () => {
  it("marca el plan como archivado", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const casoUso = new ArchivarPlan(planes);

    await casoUso.ejecutar({ id: "pla-1", archivado: true });
    expect(planes.marcarArchivado).toHaveBeenCalledWith("pla-1", true);
  });

  it("lanza ErrorPlanNoEncontrado si no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ArchivarPlan(planes);

    await expect(
      casoUso.ejecutar({ id: "inexistente", archivado: true }),
    ).rejects.toBeInstanceOf(ErrorPlanNoEncontrado);
  });
});

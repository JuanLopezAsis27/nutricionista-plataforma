import { describe, it, expect, vi } from "vitest";
import { MoverPlanAGrupo } from "./MoverPlanAGrupo";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";
import {
  mockPlanRepositorio,
  mockGrupoPlanRepositorio,
  planEjemplo,
  grupoPlanEjemplo,
} from "../_ayudas-test";

describe("MoverPlanAGrupo", () => {
  it("mueve el plan a la carpeta", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const grupos = mockGrupoPlanRepositorio({
      obtenerPorId: vi.fn(async () => grupoPlanEjemplo()),
    });
    const casoUso = new MoverPlanAGrupo(planes, grupos);

    await casoUso.ejecutar({ planId: "pla-1", grupoId: "gru-1" });

    // Toca SOLO la carpeta: mover no puede reescribir el contenido del plan.
    expect(planes.moverAGrupo).toHaveBeenCalledWith("pla-1", "gru-1");
    expect(planes.actualizar).not.toHaveBeenCalled();
  });

  it("saca el plan de la carpeta con grupoId null, sin buscar carpeta", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const grupos = mockGrupoPlanRepositorio();
    const casoUso = new MoverPlanAGrupo(planes, grupos);

    await casoUso.ejecutar({ planId: "pla-1", grupoId: null });

    expect(planes.moverAGrupo).toHaveBeenCalledWith("pla-1", null);
    expect(grupos.obtenerPorId).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlanNoEncontrado si el plan no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new MoverPlanAGrupo(planes, mockGrupoPlanRepositorio());

    await expect(
      casoUso.ejecutar({ planId: "pla-x", grupoId: null }),
    ).rejects.toBeInstanceOf(ErrorPlanNoEncontrado);
    expect(planes.moverAGrupo).not.toHaveBeenCalled();
  });

  it("lanza ErrorGrupoPlanNoEncontrado si la carpeta no existe", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const casoUso = new MoverPlanAGrupo(planes, mockGrupoPlanRepositorio());

    await expect(
      casoUso.ejecutar({ planId: "pla-1", grupoId: "gru-x" }),
    ).rejects.toBeInstanceOf(ErrorGrupoPlanNoEncontrado);
    expect(planes.moverAGrupo).not.toHaveBeenCalled();
  });
});

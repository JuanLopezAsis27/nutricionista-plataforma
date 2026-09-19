import { describe, it, expect, vi } from "vitest";
import { ObtenerPlanesDelPaciente } from "./ObtenerPlanesDelPaciente";
import { mockAsignacionPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ObtenerPlanesDelPaciente", () => {
  it("devuelve TODOS los planes asignados, no uno solo", async () => {
    const asignaciones = mockAsignacionPlanRepositorio({
      listarPlanesDePaciente: vi.fn(async () => [
        planEjemplo({ nombre: "Plan de descenso" }, "pla-1"),
        planEjemplo({ nombre: "Semana de competencia" }, "pla-2"),
      ]),
    });
    const casoUso = new ObtenerPlanesDelPaciente(asignaciones);

    const planes = await casoUso.ejecutar("pac-1");

    expect(planes.map((p) => p.id)).toEqual(["pla-1", "pla-2"]);
    expect(asignaciones.listarPlanesDePaciente).toHaveBeenCalledWith("pac-1");
  });

  it("devuelve la lista vacía si no tiene ninguno", async () => {
    const casoUso = new ObtenerPlanesDelPaciente(
      mockAsignacionPlanRepositorio(),
    );
    expect(await casoUso.ejecutar("pac-1")).toEqual([]);
  });
});

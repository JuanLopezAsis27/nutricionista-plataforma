import { describe, it, expect, vi } from "vitest";
import { AsignarPlanAVariosPacientes } from "./AsignarPlanAVariosPacientes";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockPacienteRepositorio,
  planEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("AsignarPlanAVariosPacientes", () => {
  it("asigna el plan a cada paciente de la lista", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async (id: string) => pacienteEjemplo({}, id)),
    });
    const asignarUC = new AsignarPlanAPaciente(planes, asignaciones, pacientes);
    const casoUso = new AsignarPlanAVariosPacientes(asignarUC);

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-2"],
      fechaInicio: new Date("2026-01-01"),
    });

    expect(resultados).toHaveLength(2);
    expect(resultados.every((r) => r.asignacion !== null)).toBe(true);
    expect(asignaciones.asignarAPaciente).toHaveBeenCalledTimes(2);
  });

  it("un paciente inexistente no aborta a los demás", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async (id: string) =>
        id === "pac-1" ? pacienteEjemplo({}, id) : null,
      ),
    });
    const asignarUC = new AsignarPlanAPaciente(planes, asignaciones, pacientes);
    const casoUso = new AsignarPlanAVariosPacientes(asignarUC);

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-x"],
      fechaInicio: new Date("2026-01-01"),
    });

    const ok = resultados.find((r) => r.pacienteId === "pac-1");
    const fallo = resultados.find((r) => r.pacienteId === "pac-x");
    expect(ok?.asignacion).not.toBeNull();
    expect(fallo?.asignacion).toBeNull();
    expect(fallo?.error).toBeTruthy();
  });

  it("no repite pacientes duplicados", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async (id: string) => pacienteEjemplo({}, id)),
    });
    const asignarUC = new AsignarPlanAPaciente(planes, asignaciones, pacientes);
    const casoUso = new AsignarPlanAVariosPacientes(asignarUC);

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-1"],
      fechaInicio: new Date("2026-01-01"),
    });

    expect(resultados).toHaveLength(1);
  });
});

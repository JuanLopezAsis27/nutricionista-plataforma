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

/** Repositorio de pacientes en el que existen solo los ids indicados. */
function pacientesConIds(...ids: string[]) {
  return mockPacienteRepositorio({
    obtenerPorId: vi.fn(async (id: string) =>
      ids.includes(id) ? pacienteEjemplo({}, id) : null,
    ),
    obtenerPorIds: vi.fn(async (pedidos: readonly string[]) =>
      pedidos
        .filter((id) => ids.includes(id))
        .map((id) => pacienteEjemplo({}, id)),
    ),
  });
}

describe("AsignarPlanAVariosPacientes", () => {
  it("asigna el plan a cada paciente de la lista", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1", "pac-2");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-2"],
    });

    expect(resultados).toHaveLength(2);
    expect(resultados.every((r) => r.asignacion !== null)).toBe(true);
    expect(asignaciones.asignarAPaciente).toHaveBeenCalledTimes(2);
  });

  it("lee el plan y los pacientes UNA vez para todo el lote", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1", "pac-2", "pac-3");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-2", "pac-3"],
    });

    expect(planes.obtenerPorId).toHaveBeenCalledTimes(1);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledTimes(1);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledWith([
      "pac-1",
      "pac-2",
      "pac-3",
    ]);
    expect(pacientes.obtenerPorId).not.toHaveBeenCalled();
  });

  it("un paciente inexistente no aborta a los demás", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-x"],
    });

    const ok = resultados.find((r) => r.pacienteId === "pac-1");
    const fallo = resultados.find((r) => r.pacienteId === "pac-x");
    expect(ok?.asignacion).not.toBeNull();
    expect(fallo?.asignacion).toBeNull();
    expect(fallo?.error).toContain("pac-x");
    expect(asignaciones.asignarAPaciente).toHaveBeenCalledTimes(1);
  });

  it("una falla al guardar una asignación no aborta a los demás", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      asignarAPaciente: vi.fn(async (a) => {
        if (a.pacienteId === "pac-1") throw new Error("se cayó la base");
        return { ...a, asignadoEn: new Date() };
      }),
    });
    const pacientes = pacientesConIds("pac-1", "pac-2");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-2"],
    });

    expect(resultados[0]).toMatchObject({
      pacienteId: "pac-1",
      asignacion: null,
      error: "se cayó la base",
    });
    expect(resultados[1]?.asignacion).not.toBeNull();
  });

  it("con una plantilla no asigna a nadie y cada paciente lleva el motivo", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo({ esPlantilla: true })),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1", "pac-2");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-2"],
    });

    expect(asignaciones.asignarAPaciente).not.toHaveBeenCalled();
    expect(resultados.every((r) => r.asignacion === null)).toBe(true);
    expect(resultados.every((r) => r.error?.includes("plantilla"))).toBe(true);
  });

  it("da a cada paciente el mismo motivo que la asignación de a uno", async () => {
    // Primero se mira el paciente y después el plan: con el plan inexistente,
    // al paciente que tampoco existe se le informa lo suyo.
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1");
    const varios = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );
    const deAUno = new AsignarPlanAPaciente(planes, asignaciones, pacientes);

    const resultados = await varios.ejecutar({
      planId: "pla-x",
      pacienteIds: ["pac-1", "pac-x"],
    });

    for (const resultado of resultados) {
      await expect(
        deAUno.ejecutar({ planId: "pla-x", pacienteId: resultado.pacienteId }),
      ).rejects.toThrow(resultado.error ?? "");
    }
    expect(resultados.map((r) => r.error)).toEqual([
      expect.stringContaining("pla-x"),
      expect.stringContaining("pac-x"),
    ]);
  });

  it("no repite pacientes duplicados", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds("pac-1");
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    const resultados = await casoUso.ejecutar({
      planId: "pla-1",
      pacienteIds: ["pac-1", "pac-1"],
    });

    expect(resultados).toHaveLength(1);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledWith(["pac-1"]);
  });

  it("sin pacientes no consulta nada", async () => {
    const planes = mockPlanRepositorio();
    const asignaciones = mockAsignacionPlanRepositorio();
    const pacientes = pacientesConIds();
    const casoUso = new AsignarPlanAVariosPacientes(
      planes,
      asignaciones,
      pacientes,
    );

    expect(
      await casoUso.ejecutar({ planId: "pla-1", pacienteIds: [] }),
    ).toEqual([]);
    expect(planes.obtenerPorId).not.toHaveBeenCalled();
    expect(pacientes.obtenerPorIds).not.toHaveBeenCalled();
  });
});

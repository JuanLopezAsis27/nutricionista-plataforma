import { describe, it, expect, vi } from "vitest";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockPacienteRepositorio,
  planEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const datos = { planId: "pla-1", pacienteId: "pac-1" };

describe("AsignarPlanAPaciente", () => {
  it("crea el vínculo sin tocar los planes que el paciente ya tenga", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const casoUso = new AsignarPlanAPaciente(planes, asignaciones, pacientes);

    const asignacion = await casoUso.ejecutar(datos);

    expect(asignaciones.asignarAPaciente).toHaveBeenCalledOnce();
    expect(asignacion.planId).toBe("pla-1");
    expect(asignacion.pacienteId).toBe("pac-1");
    // Asignar SUMA: no hay nada que desasignar de paso.
    expect(asignaciones.desasignarDePaciente).not.toHaveBeenCalled();
  });

  it("rechaza asignar una plantilla directamente", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo({ esPlantilla: true })),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const casoUso = new AsignarPlanAPaciente(planes, asignaciones, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(asignaciones.asignarAPaciente).not.toHaveBeenCalled();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new AsignarPlanAPaciente(
      mockPlanRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });

  it("lanza ErrorPlanNoEncontrado si el plan no existe", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarPlanAPaciente(
      mockPlanRepositorio(),
      mockAsignacionPlanRepositorio(),
      pacientes,
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

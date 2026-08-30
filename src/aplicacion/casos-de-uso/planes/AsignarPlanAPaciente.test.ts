import { describe, it, expect, vi } from "vitest";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlanRepositorio,
  mockPacienteRepositorio,
  planEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const datos = {
  planId: "pla-1",
  pacienteId: "pac-1",
  fechaInicio: new Date("2026-07-01"),
  fechaFin: null,
};

describe("AsignarPlanAPaciente", () => {
  it("desactiva la asignación previa y crea una nueva activa", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarPlanAPaciente(planes, pacientes);

    const asignacion = await casoUso.ejecutar(datos);

    // La anterior se cierra con el INICIO de la nueva, no con "hoy": el plan
    // viejo rigió hasta que empezó el que lo reemplaza.
    expect(planes.desactivarAsignacionesDe).toHaveBeenCalledWith(
      "pac-1",
      datos.fechaInicio,
    );
    expect(planes.asignarAPaciente).toHaveBeenCalledOnce();
    expect(asignacion.activa).toBe(true);
    // Foto del nombre: sobrevive a que el plan se renombre o se borre.
    expect(asignacion.nombrePlan).toBe(planEjemplo().nombre);
    expect(asignacion.finalizadaEn).toBeNull();
  });

  it("rechaza asignar una plantilla directamente", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo({ esPlantilla: true })),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarPlanAPaciente(planes, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(planes.desactivarAsignacionesDe).not.toHaveBeenCalled();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new AsignarPlanAPaciente(
      mockPlanRepositorio(),
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
    const casoUso = new AsignarPlanAPaciente(mockPlanRepositorio(), pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

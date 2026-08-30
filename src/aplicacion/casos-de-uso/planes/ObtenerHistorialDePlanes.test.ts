import { describe, it, expect, vi } from "vitest";
import { ObtenerHistorialDePlanes } from "./ObtenerHistorialDePlanes";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockPlanRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("ObtenerHistorialDePlanes", () => {
  it("devuelve el historial, incluidas las entradas cuyo plan se borró", async () => {
    const planes = mockPlanRepositorio({
      listarAsignacionesDePaciente: vi.fn(async () => [
        {
          id: "asig-2",
          planId: "pla-1",
          nombrePlan: "Plan actual",
          pacienteId: "pac-1",
          fechaInicio: new Date("2026-07-01"),
          fechaFin: null,
          finalizadaEn: null,
          activa: true,
        },
        {
          // El plan se borró: queda el nombre que tenía al asignarse.
          id: "asig-1",
          planId: null,
          nombrePlan: "Plan del verano",
          pacienteId: "pac-1",
          fechaInicio: new Date("2026-01-10"),
          fechaFin: null,
          finalizadaEn: new Date("2026-07-01"),
          activa: false,
        },
      ]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerHistorialDePlanes(planes, pacientes);

    const historial = await casoUso.ejecutar("pac-1");

    expect(historial).toHaveLength(2);
    expect(historial[1]).toMatchObject({
      planId: null,
      nombrePlan: "Plan del verano",
    });
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ObtenerHistorialDePlanes(
      planes,
      mockPacienteRepositorio(),
    );

    await expect(casoUso.ejecutar("pac-x")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(planes.listarAsignacionesDePaciente).not.toHaveBeenCalled();
  });
});

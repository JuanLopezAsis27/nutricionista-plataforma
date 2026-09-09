import { describe, it, expect, vi } from "vitest";
import { SincronizarRecetasDePlan } from "./SincronizarRecetasDePlan";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockRecetaRepositorio,
  planEjemplo,
} from "../_ayudas-test";

function asignacionEjemplo(pacienteId: string, activa = true) {
  return {
    id: `asig-${pacienteId}`,
    planId: "pla-1",
    nombrePlan: "Plan descenso",
    pacienteId,
    pacienteNombre: "Julia",
    pacienteApellido: "Pérez",
    fechaInicio: new Date("2026-07-01"),
    fechaFin: null,
    finalizadaEn: null,
    activa,
  };
}

const planConRecetas = planEjemplo({
  comidas: [
    {
      nombre: "Desayuno",
      opciones: [
        { contenido: "Tostadas", recetaId: "rec-1" },
        { contenido: "Yogur con granola", recetaId: "rec-2" },
      ],
    },
    {
      nombre: "Almuerzo",
      opciones: [{ contenido: "Ensalada", recetaId: "rec-1" }],
    },
  ],
});

describe("SincronizarRecetasDePlan", () => {
  it("comparte cada receta de las franjas con los pacientes que siguen el plan hoy", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planConRecetas),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      listarAsignacionesDePlan: vi.fn(async () => [
        asignacionEjemplo("pac-1"),
        asignacionEjemplo("pac-2", false),
      ]),
    });
    const recetas = mockRecetaRepositorio();
    const casoUso = new SincronizarRecetasDePlan(planes, asignaciones, recetas);

    await casoUso.ejecutar("pla-1");

    // Solo el paciente con asignación ACTIVA recibe las recetas: pac-2 ya dejó
    // este plan y no debe verse afectado.
    expect(recetas.asignarAPaciente).toHaveBeenCalledTimes(2);
    expect(recetas.asignarAPaciente).toHaveBeenCalledWith(
      "rec-1",
      "pac-1",
      expect.any(String),
    );
    expect(recetas.asignarAPaciente).toHaveBeenCalledWith(
      "rec-2",
      "pac-1",
      expect.any(String),
    );
  });

  it("no hace nada si el plan no usa recetas", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      listarAsignacionesDePlan: vi.fn(async () => [asignacionEjemplo("pac-1")]),
    });
    const recetas = mockRecetaRepositorio();
    const casoUso = new SincronizarRecetasDePlan(planes, asignaciones, recetas);

    await casoUso.ejecutar("pla-1");

    expect(recetas.asignarAPaciente).not.toHaveBeenCalled();
  });

  it("no hace nada si nadie sigue hoy el plan", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planConRecetas),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      listarAsignacionesDePlan: vi.fn(async () => []),
    });
    const recetas = mockRecetaRepositorio();
    const casoUso = new SincronizarRecetasDePlan(planes, asignaciones, recetas);

    await casoUso.ejecutar("pla-1");

    expect(recetas.asignarAPaciente).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlanNoEncontrado si el plan no existe", async () => {
    const casoUso = new SincronizarRecetasDePlan(
      mockPlanRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockRecetaRepositorio(),
    );

    await expect(casoUso.ejecutar("pla-x")).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

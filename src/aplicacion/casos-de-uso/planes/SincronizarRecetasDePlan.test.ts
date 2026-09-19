import { describe, it, expect, vi } from "vitest";
import { SincronizarRecetasDePlan } from "./SincronizarRecetasDePlan";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockRecetaRepositorio,
  planEjemplo,
} from "../_ayudas-test";

function asignacionEjemplo(pacienteId: string) {
  return {
    id: `asig-${pacienteId}`,
    planId: "pla-1",
    pacienteId,
    pacienteNombre: "Julia",
    pacienteApellido: "Pérez",
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
  it("comparte cada receta de las franjas con todos los que tienen el plan", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planConRecetas),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      listarAsignacionesDePlan: vi.fn(async () => [
        asignacionEjemplo("pac-1"),
        asignacionEjemplo("pac-2"),
      ]),
    });
    const recetas = mockRecetaRepositorio();
    const casoUso = new SincronizarRecetasDePlan(planes, asignaciones, recetas);

    await casoUso.ejecutar("pla-1");

    // Dos recetas únicas (rec-1 aparece en dos franjas) por dos pacientes.
    expect(recetas.asignarAPaciente).toHaveBeenCalledTimes(4);
    for (const pacienteId of ["pac-1", "pac-2"]) {
      expect(recetas.asignarAPaciente).toHaveBeenCalledWith(
        "rec-1",
        pacienteId,
        expect.any(String),
      );
      expect(recetas.asignarAPaciente).toHaveBeenCalledWith(
        "rec-2",
        pacienteId,
        expect.any(String),
      );
    }
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

  it("no hace nada si nadie tiene el plan asignado", async () => {
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

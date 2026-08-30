import { describe, it, expect, vi } from "vitest";
import { EliminarPlan } from "./EliminarPlan";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  planEjemplo,
} from "../_ayudas-test";

/**
 * Borrar un plan cruza los dos agregados: el plan es del consultorio, pero las
 * asignaciones son el historial de los pacientes. Por eso el caso de uso recibe
 * los dos puertos, y por eso pregunta antes de borrar.
 */
describe("EliminarPlan", () => {
  it("elimina un plan sin asignaciones activas", async () => {
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio();
    const casoUso = new EliminarPlan(planes, asignaciones);

    await casoUso.ejecutar("pla-1");
    expect(planes.eliminar).toHaveBeenCalledWith("pla-1");
  });

  it("rechaza eliminar un plan con asignaciones activas", async () => {
    // El plan que alguien está siguiendo no se borra: hay pacientes cuyo "Mi
    // plan" quedaría vacío de un día para el otro.
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo()),
    });
    const asignaciones = mockAsignacionPlanRepositorio({
      contarAsignacionesActivasDePlan: vi.fn(async () => 2),
    });
    const casoUso = new EliminarPlan(planes, asignaciones);

    await expect(casoUso.ejecutar("pla-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(planes.eliminar).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlanNoEncontrado si no existe", async () => {
    const casoUso = new EliminarPlan(
      mockPlanRepositorio(),
      mockAsignacionPlanRepositorio(),
    );

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorPlanNoEncontrado,
    );
  });
});

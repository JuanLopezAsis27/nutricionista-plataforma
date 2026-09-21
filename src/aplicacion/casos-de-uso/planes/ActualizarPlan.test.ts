import { describe, it, expect, vi } from "vitest";
import { ActualizarPlan } from "./ActualizarPlan";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { mockPlanRepositorio, planEjemplo } from "../_ayudas-test";

describe("ActualizarPlan", () => {
  it("reemplaza el contenido preservando esPlantilla y creadoEn", async () => {
    const original = planEjemplo({ esPlantilla: true });
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => original),
    });
    const casoUso = new ActualizarPlan(planes);

    const plan = await casoUso.ejecutar({
      id: "pla-1",
      nombre: "Plan renovado",
      comidas: [{ nombre: "Cena", opciones: [{ contenido: "Sopa" }] }],
    });

    const datos = plan.aPrimitivos();
    expect(datos.nombre).toBe("Plan renovado");
    expect(datos.esPlantilla).toBe(true); // preservado
    expect(datos.creadoEn).toEqual(original.aPrimitivos().creadoEn);
    expect(datos.comidas).toHaveLength(1);
    expect(planes.actualizar).toHaveBeenCalledOnce();
  });

  it("lleva el testigo de versión hasta el repositorio", async () => {
    // Es el agregado donde más pesa el bloqueo optimista: `actualizar`
    // reemplaza franjas, opciones, equivalencias y recomendaciones, así que
    // una edición concurrente no pierde un campo, rehace el plan entero desde
    // una foto vieja. Si el testigo se pierde en el camino nada falla.
    const planes = mockPlanRepositorio({
      obtenerPorId: vi.fn(async () => planEjemplo({})),
    });
    const casoUso = new ActualizarPlan(planes);
    const abiertoEn = new Date("2026-03-01T10:00:00.000Z");

    await casoUso.ejecutar({
      id: "pla-1",
      nombre: "Plan renovado",
      comidas: [{ nombre: "Cena", opciones: [{ contenido: "Sopa" }] }],
      actualizadoEn: abiertoEn,
    });

    const [, , , esperadoEn] = vi.mocked(planes.actualizar).mock.calls[0]!;
    expect(esperadoEn).toEqual(abiertoEn);
  });

  it("lanza ErrorPlanNoEncontrado si el plan no existe", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new ActualizarPlan(planes);

    await expect(
      casoUso.ejecutar({
        id: "inexistente",
        nombre: "X",
        comidas: [{ nombre: "Cena", opciones: [{ contenido: "Sopa" }] }],
      }),
    ).rejects.toBeInstanceOf(ErrorPlanNoEncontrado);
  });
});

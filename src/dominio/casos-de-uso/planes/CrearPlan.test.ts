import { describe, it, expect } from "vitest";
import { CrearPlan } from "./CrearPlan";
import { PlanNutricional } from "../../entidades/PlanNutricional";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockPlanRepositorio } from "../_ayudas-test";

describe("CrearPlan", () => {
  it("crea un plan con franjas, opciones numeradas y extras", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    const plan = await casoUso.ejecutar({
      nombre: "Plan A",
      caloriasMeta: 1800,
      comidas: [
        {
          nombre: "Desayuno",
          horaDesde: "08:00",
          horaHasta: "09:00",
          opciones: [{ contenido: "Opción uno" }, { contenido: "Opción dos" }],
        },
      ],
      recomendaciones: [{ tipo: "SALUD", texto: "Dormir 8 horas." }],
    });

    expect(plan).toBeInstanceOf(PlanNutricional);
    const datos = plan.aPrimitivos();
    expect(datos.comidas[0]!.opciones.map((o) => o.numero)).toEqual([1, 2]);
    expect(datos.recomendaciones).toHaveLength(1);
    expect(planes.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorValidacion si una franja no tiene opciones", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan vacío",
        comidas: [{ nombre: "Desayuno", opciones: [] }],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorValidacion si la hora no es HH:mm", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan",
        comidas: [
          { nombre: "Desayuno", horaDesde: "8am", opciones: [{ contenido: "X" }] },
        ],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

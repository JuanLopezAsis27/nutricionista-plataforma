import { describe, it, expect, vi } from "vitest";
import { CrearPlan } from "./CrearPlan";
import { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorPlanDuplicado } from "@/dominio/errores/ErrorPlanDuplicado";
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
          {
            nombre: "Desayuno",
            horaDesde: "8am",
            opciones: [{ contenido: "X" }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("crea un plan en PDF: sin comidas, con el archivo como principal", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    const plan = await casoUso.ejecutar({
      nombre: "Plan de Julia",
      modalidad: "PDF",
      comidas: [],
      archivoPrincipalId: "arc-plan",
    });

    const datos = plan.aPrimitivos();
    expect(datos.modalidad).toBe("PDF");
    expect(datos.comidas).toHaveLength(0);
    expect(datos.archivoPrincipalId).toBe("arc-plan");
    // El principal viaja en la lista a vincular aunque no venga en archivoIds.
    expect(planes.crear).toHaveBeenCalledWith(plan, ["arc-plan"]);
  });

  it("vincula los anexos junto al principal, sin repetirlo", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    const plan = await casoUso.ejecutar({
      nombre: "Plan de Julia",
      modalidad: "PDF",
      comidas: [],
      archivoPrincipalId: "arc-plan",
      archivoIds: ["arc-plan", "arc-compras"],
    });

    expect(planes.crear).toHaveBeenCalledWith(plan, [
      "arc-plan",
      "arc-compras",
    ]);
  });

  it("un plan de la app lleva anexos sin archivo principal", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    const plan = await casoUso.ejecutar({
      nombre: "Plan mixto",
      comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Café" }] }],
      archivoIds: ["arc-compras"],
    });

    const datos = plan.aPrimitivos();
    expect(datos.modalidad).toBe("APP");
    expect(datos.archivoPrincipalId).toBeNull();
    expect(planes.crear).toHaveBeenCalledWith(plan, ["arc-compras"]);
  });

  it("lanza ErrorValidacion si un plan en PDF no trae el archivo", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan sin archivo",
        modalidad: "PDF",
        comidas: [],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorValidacion si un plan en PDF trae comidas cargadas", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan de dos caras",
        modalidad: "PDF",
        archivoPrincipalId: "arc-plan",
        comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Café" }] }],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorValidacion si un plan de la app declara archivo principal", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan con anexo ascendido",
        comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Café" }] }],
        archivoPrincipalId: "arc-compras",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorValidacion si un plan de la app no tiene comidas", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({ nombre: "Plan sin nada", comidas: [] }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("rechaza un plan con un nombre que ya existe", async () => {
    const planes = mockPlanRepositorio({
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new CrearPlan(planes);

    await expect(
      casoUso.ejecutar({
        nombre: "Plan A",
        comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Café" }] }],
      }),
    ).rejects.toBeInstanceOf(ErrorPlanDuplicado);
    expect(planes.crear).not.toHaveBeenCalled();
  });

  it("consulta el duplicado en el espacio que corresponde (plan o plantilla)", async () => {
    const planes = mockPlanRepositorio();
    const casoUso = new CrearPlan(planes);

    await casoUso.ejecutar({
      nombre: "Descenso",
      esPlantilla: true,
      comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Café" }] }],
    });

    // Una plantilla "Descenso" no choca con el plan "Descenso" que sale de
    // ella: son espacios separados.
    expect(planes.existeNombre).toHaveBeenCalledWith("Descenso", true);
  });
});

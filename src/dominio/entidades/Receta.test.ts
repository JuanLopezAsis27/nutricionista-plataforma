import { describe, it, expect } from "vitest";
import { Receta } from "./Receta";
import { ErrorValidacion } from "../errores/ErrorValidacion";

describe("Receta — cálculo de macros desde los ingredientes", () => {
  it("suma los macros de los ingredientes y los reparte por porción", () => {
    const receta = Receta.crear(
      {
        nombre: "Bowl",
        porciones: 2,
        ingredientes: [
          {
            nombre: "A",
            cantidadGramos: 200,
            caloriasPor100: 100,
            proteinasPor100: 20,
          },
          {
            nombre: "B",
            cantidadGramos: 50,
            caloriasPor100: 400,
            carbohidratosPor100: 10,
          },
        ],
      },
      "rec-1",
    );

    // Totales de la receta: A→200 kcal/40 g P; B→200 kcal/5 g C. Sin grasas.
    expect(receta.totales()).toEqual({
      calorias: 400,
      proteinasG: 40,
      carbohidratosG: 5,
      grasasG: null,
    });

    // Por porción (÷2): quedan guardados en los campos de macros.
    const p = receta.aPrimitivos();
    expect(p.calorias).toBe(200);
    expect(p.proteinasG).toBe(20);
    expect(p.carbohidratosG).toBe(2.5);
    expect(p.grasasG).toBeNull();
    expect(receta.macrosCalculados).toBe(true);
  });

  it("ignora los ingredientes sin cantidad al sumar", () => {
    const receta = Receta.crear(
      {
        nombre: "X",
        porciones: 1,
        ingredientes: [
          { nombre: "A", cantidadGramos: 100, caloriasPor100: 50 },
          { nombre: "B", caloriasPor100: 999 }, // sin gramos → no aporta
        ],
      },
      "rec-2",
    );

    expect(receta.totales().calorias).toBe(50);
  });

  it("usa los macros cargados a mano si ningún ingrediente trae datos", () => {
    const receta = Receta.crear(
      {
        nombre: "X",
        porciones: 1,
        ingredientes: [{ nombre: "Sal", cantidadGramos: 5 }],
        calorias: 300,
        proteinasG: 10,
      },
      "rec-3",
    );

    expect(receta.macrosCalculados).toBe(false);
    const p = receta.aPrimitivos();
    expect(p.calorias).toBe(300);
    expect(p.proteinasG).toBe(10);
    expect(receta.totales()).toEqual({
      calorias: null,
      proteinasG: null,
      carbohidratosG: null,
      grasasG: null,
    });
  });

  it("descarta ingredientes con nombre vacío", () => {
    const receta = Receta.crear(
      {
        nombre: "X",
        ingredientes: [{ nombre: "Pollo" }, { nombre: "   " }],
      },
      "rec-4",
    );

    expect(receta.aPrimitivos().ingredientes.map((i) => i.nombre)).toEqual([
      "Pollo",
    ]);
  });

  it("rechaza cantidades o macros negativos", () => {
    expect(() =>
      Receta.crear(
        { nombre: "X", ingredientes: [{ nombre: "A", cantidadGramos: -1 }] },
        "rec-5",
      ),
    ).toThrow(ErrorValidacion);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  AlimentoPropio,
  LARGO_MAXIMO_DESCRIPCION_ALIMENTO,
  SODIO_MAXIMO_POR_100,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { ImportarAlimentos } from "./ImportarAlimentos";

/**
 * Cafeína y descripción (migración 95) y sodio (migración 99) de los
 * alimentos. Lo que fijan: que la cafeína y el sodio no pueden ser negativos
 * (van por 100 g/ml, como los macros), que el sodio no pasa el de la sal de
 * mesa, que la descripción se limpia y tiene tope, y que REEMPLAZAR la lista
 * con una planilla que no trae esas columnas no borra lo que se cargó a mano.
 */

describe("AlimentoPropio — cafeína y descripción", () => {
  it("guarda la cafeína por 100 y la descripción limpia", () => {
    const gel = AlimentoPropio.crear(
      { nombre: "Gel", cafeinaPor100: 100, descripcion: "  Con agua  " },
      "ali-1",
    );
    expect(gel.aPrimitivos()).toMatchObject({
      cafeinaPor100: 100,
      descripcion: "Con agua",
    });
    const sinDatos = AlimentoPropio.crear({ nombre: "Arroz" }, "ali-2");
    expect(sinDatos.aPrimitivos()).toMatchObject({
      cafeinaPor100: null,
      descripcion: null,
    });
  });

  it("rechaza la cafeína negativa o absurda y la descripción demasiado larga", () => {
    expect(() =>
      AlimentoPropio.crear({ nombre: "Gel", cafeinaPor100: -1 }, "x"),
    ).toThrow(ErrorValidacion);
    expect(() =>
      AlimentoPropio.crear({ nombre: "Gel", cafeinaPor100: 1_000_000 }, "x"),
    ).toThrow(ErrorValidacion);
    expect(() =>
      AlimentoPropio.crear(
        {
          nombre: "Gel",
          descripcion: "a".repeat(LARGO_MAXIMO_DESCRIPCION_ALIMENTO + 1),
        },
        "x",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("editar sin mandarlas las deja como estaban; con null se quitan", () => {
    const gel = AlimentoPropio.crear(
      { nombre: "Gel", cafeinaPor100: 100, descripcion: "Con agua" },
      "ali-1",
    );
    expect(gel.actualizar({ marca: "X" }).aPrimitivos()).toMatchObject({
      cafeinaPor100: 100,
      descripcion: "Con agua",
    });
    expect(
      gel.actualizar({ cafeinaPor100: null, descripcion: null }).aPrimitivos(),
    ).toMatchObject({ cafeinaPor100: null, descripcion: null });
  });
});

describe("AlimentoPropio — sodio", () => {
  it("guarda el sodio por 100; sin dato es null, no 0", () => {
    expect(
      AlimentoPropio.crear(
        { nombre: "Isotónica", sodioPor100: 45 },
        "a",
      ).aPrimitivos().sodioPor100,
    ).toBe(45);
    expect(
      AlimentoPropio.crear({ nombre: "Arroz" }, "b").aPrimitivos().sodioPor100,
    ).toBeNull();
  });

  it("acepta la sal de mesa y rechaza el negativo o más que ella", () => {
    expect(
      AlimentoPropio.crear(
        { nombre: "Sal fina", sodioPor100: 38_758 },
        "x",
      ).aPrimitivos().sodioPor100,
    ).toBe(38_758);
    expect(() =>
      AlimentoPropio.crear({ nombre: "Gel", sodioPor100: -1 }, "x"),
    ).toThrow(ErrorValidacion);
    expect(() =>
      AlimentoPropio.crear(
        { nombre: "Gel", sodioPor100: SODIO_MAXIMO_POR_100 + 1 },
        "x",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("editar sin mandarlo lo deja como estaba; con null se quita", () => {
    const gel = AlimentoPropio.crear({ nombre: "Gel", sodioPor100: 125 }, "a");
    expect(gel.actualizar({ marca: "X" }).aPrimitivos().sodioPor100).toBe(125);
    expect(
      gel.actualizar({ sodioPor100: null }).aPrimitivos().sodioPor100,
    ).toBeNull();
  });
});

describe("ImportarAlimentos — cafeína, sodio y descripción", () => {
  it("una planilla sin esas columnas no borra las que se cargaron a mano", async () => {
    const anterior = alimentoPropioEjemplo({
      nombre: "Gel",
      cafeinaPor100: 100,
      sodioPor100: 125,
      descripcion: "Con agua",
    });
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [anterior]),
        reemplazarTodos,
      }),
    ).ejecutar([{ nombre: "gel", carbohidratosPor100: 62.5 }]);

    const [gel] = reemplazarTodos.mock.calls[0]![0];
    expect(gel!.aPrimitivos()).toMatchObject({
      carbohidratosPor100: 62.5,
      cafeinaPor100: 100,
      sodioPor100: 125,
      descripcion: "Con agua",
    });
  });

  it("si la planilla las trae, ganan las de la planilla", async () => {
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [
          alimentoPropioEjemplo({
            nombre: "Gel",
            cafeinaPor100: 100,
            sodioPor100: 125,
          }),
        ]),
        reemplazarTodos,
      }),
    ).ejecutar([
      {
        nombre: "Gel",
        cafeinaPor100: 200,
        sodioPor100: 80,
        descripcion: "Nuevo",
      },
    ]);

    expect(reemplazarTodos.mock.calls[0]![0][0]!.aPrimitivos()).toMatchObject({
      cafeinaPor100: 200,
      sodioPor100: 80,
      descripcion: "Nuevo",
    });
  });
});

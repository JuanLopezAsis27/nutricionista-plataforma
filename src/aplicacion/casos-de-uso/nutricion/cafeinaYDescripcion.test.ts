import { describe, it, expect, vi } from "vitest";
import {
  AlimentoPropio,
  LARGO_MAXIMO_DESCRIPCION_ALIMENTO,
} from "@/dominio/entidades/AlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { ImportarAlimentos } from "./ImportarAlimentos";

/**
 * Cafeína y descripción de los alimentos (migración 95). Lo que fijan: que la
 * cafeína no puede ser negativa (va por 100 g/ml, como los macros), que la
 * descripción se limpia y tiene tope, y que REEMPLAZAR la lista con una
 * planilla que no trae esas columnas no borra lo que se cargó a mano.
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

describe("ImportarAlimentos — cafeína y descripción", () => {
  it("una planilla sin esas columnas no borra las que se cargaron a mano", async () => {
    const anterior = alimentoPropioEjemplo({
      nombre: "Gel",
      cafeinaPor100: 100,
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
      descripcion: "Con agua",
    });
  });

  it("si la planilla las trae, ganan las de la planilla", async () => {
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [
          alimentoPropioEjemplo({ nombre: "Gel", cafeinaPor100: 100 }),
        ]),
        reemplazarTodos,
      }),
    ).ejecutar([{ nombre: "Gel", cafeinaPor100: 200, descripcion: "Nuevo" }]);

    expect(reemplazarTodos.mock.calls[0]![0][0]!.aPrimitivos()).toMatchObject({
      cafeinaPor100: 200,
      descripcion: "Nuevo",
    });
  });
});

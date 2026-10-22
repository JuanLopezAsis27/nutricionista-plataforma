import { describe, it, expect, vi } from "vitest";
import { AgregarAlimentos } from "./AgregarAlimentos";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  claveIdentidadAlimento,
  type AlimentoPropio,
} from "@/dominio/entidades/AlimentoPropio";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";

describe("AgregarAlimentos", () => {
  it("suma los nuevos sin borrar la lista ni tocar los que ya estaban", async () => {
    const yaEstaba = alimentoPropioEjemplo(
      { nombre: "Avena", marca: "Quaker", caloriasPor100: 370 },
      "ali-avena",
    );
    const agregarVarios = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const actualizar = vi.fn(async (a: AlimentoPropio) => a);
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [yaEstaba]),
        agregarVarios,
        reemplazarTodos,
        actualizar,
      }),
    );

    const resultado = await uc.ejecutar([
      { nombre: "Pollo", proteinasPor100: 27 },
      // Misma identidad que la de la lista, escrita distinto y con otros macros.
      { nombre: "  avena ", marca: "QUAKER", caloriasPor100: 999 },
    ]);

    expect(resultado).toEqual({
      agregados: 1,
      repetidos: 0,
      yaEstaban: 1,
      // Con la escritura de la LISTA, para que se lo pueda encontrar.
      ejemplosYaEstaban: ["Avena (Quaker)"],
      enPlataforma: 0,
      imagenes: { cargadas: 0, descartadas: [] },
    });
    expect(agregarVarios.mock.calls[0]![0].map((a) => a.etiqueta)).toEqual([
      "Pollo",
    ]);
    expect(reemplazarTodos).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("si todos ya estaban, no escribe nada y no es un error", async () => {
    const agregarVarios = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [alimentoPropioEjemplo()]),
        agregarVarios,
      }),
    );

    const resultado = await uc.ejecutar([{ nombre: "Arroz" }]);

    expect(resultado.agregados).toBe(0);
    expect(resultado.yaEstaban).toBe(1);
    expect(agregarVarios).not.toHaveBeenCalled();
  });

  it("dentro de la planilla, de un alimento repetido queda la última fila", async () => {
    const agregarVarios = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio({ agregarVarios }),
    );

    const resultado = await uc.ejecutar([
      { nombre: "Pollo", proteinasPor100: 20 },
      { nombre: "Arroz" },
      { nombre: "pollo", proteinasPor100: 27 },
    ]);

    expect(resultado.repetidos).toBe(1);
    const enviados = agregarVarios.mock.calls[0]![0].map((a) =>
      a.aPrimitivos(),
    );
    expect(enviados.map((a) => [a.nombre, a.proteinasPor100])).toEqual([
      ["pollo", 27],
      ["Arroz", null],
    ]);
  });

  it("uno igual a uno de la plataforma entra igual (es su versión) y se cuenta", async () => {
    const clavesExistentes = vi.fn(async (claves: string[]) =>
      claves.filter((c) => c === claveIdentidadAlimento("Leche", null)),
    );
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio(),
      mockAlimentoPropioRepositorio({ clavesExistentes }),
    );

    const resultado = await uc.ejecutar([
      { nombre: "Leche" },
      { nombre: "Yerba" },
    ]);

    expect(resultado.agregados).toBe(2);
    expect(resultado.enPlataforma).toBe(1);
  });

  it("nombra hasta cinco de los que ya estaban, y cuenta todos", async () => {
    const lista = ["A", "B", "C", "D", "E", "F", "G"].map((nombre, i) =>
      alimentoPropioEjemplo({ nombre }, `ali-${i}`),
    );
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio({ listar: vi.fn(async () => lista) }),
    );

    const resultado = await uc.ejecutar(
      lista.map((a) => ({ nombre: a.etiqueta })),
    );

    expect(resultado.yaEstaban).toBe(7);
    expect(resultado.ejemplosYaEstaban).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("cuenta solo los que el repositorio llegó a insertar", async () => {
    // Otra importación al mismo tiempo metió uno entre el chequeo y la
    // escritura: el repositorio lo saltea (ON CONFLICT) y no lo cuenta.
    const uc = new AgregarAlimentos(
      mockAlimentoPropioRepositorio({
        agregarVarios: vi.fn(async (a: AlimentoPropio[]) => a.length - 1),
      }),
    );
    const resultado = await uc.ejecutar([{ nombre: "X" }, { nombre: "Y" }]);
    expect(resultado.agregados).toBe(1);
  });

  it("lanza si la planilla no tiene ningún alimento válido", async () => {
    const uc = new AgregarAlimentos(mockAlimentoPropioRepositorio());
    await expect(uc.ejecutar([{ nombre: " " }])).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { ImportarAlimentos } from "./ImportarAlimentos";
import { ObtenerEstadoAlimentosPropios } from "./ObtenerEstadoAlimentosPropios";
import { VaciarAlimentosPropios } from "./VaciarAlimentosPropios";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { mockAlimentoPropioRepositorio } from "../_ayudas-test";

describe("ImportarAlimentos", () => {
  it("reemplaza la lista con las filas válidas y descarta las vacías", async () => {
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const uc = new ImportarAlimentos(
      mockAlimentoPropioRepositorio({ reemplazarTodos }),
    );

    const total = await uc.ejecutar([
      { nombre: "Arroz", caloriasPor100: 130, proteinasPor100: 2.7 },
      { nombre: "  ", caloriasPor100: 0 }, // vacía → se ignora
      { nombre: "Pollo", proteinasPor100: 27 },
    ]);

    expect(total).toBe(2);
    const enviados = reemplazarTodos.mock.calls[0]![0];
    expect(enviados.map((x) => x.aPrimitivos().nombre)).toEqual([
      "Arroz",
      "Pollo",
    ]);
  });

  it("lanza si no hay ninguna fila válida", async () => {
    const uc = new ImportarAlimentos(mockAlimentoPropioRepositorio());
    await expect(uc.ejecutar([{ nombre: "" }])).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });

  it("lanza si una macro es negativa", async () => {
    const uc = new ImportarAlimentos(mockAlimentoPropioRepositorio());
    await expect(
      uc.ejecutar([{ nombre: "X", caloriasPor100: -5 }]),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("ObtenerEstadoAlimentosPropios", () => {
  it("activo=true cuando hay alimentos cargados", async () => {
    const uc = new ObtenerEstadoAlimentosPropios(
      mockAlimentoPropioRepositorio({ contar: vi.fn(async () => 42) }),
    );
    expect(await uc.ejecutar()).toEqual({ cantidad: 42, activo: true });
  });

  it("activo=false cuando la lista está vacía", async () => {
    const uc = new ObtenerEstadoAlimentosPropios(
      mockAlimentoPropioRepositorio(),
    );
    expect(await uc.ejecutar()).toEqual({ cantidad: 0, activo: false });
  });
});

describe("VaciarAlimentosPropios", () => {
  it("vacía la lista del inquilino", async () => {
    const vaciar = vi.fn(async () => {});
    const uc = new VaciarAlimentosPropios(
      mockAlimentoPropioRepositorio({ vaciar }),
    );
    await uc.ejecutar();
    expect(vaciar).toHaveBeenCalledOnce();
  });
});

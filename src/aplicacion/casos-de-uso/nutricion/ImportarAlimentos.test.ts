import { describe, it, expect, vi } from "vitest";
import { ImportarAlimentos } from "./ImportarAlimentos";
import { ObtenerEstadoAlimentosPropios } from "./ObtenerEstadoAlimentosPropios";
import { VaciarAlimentosPropios } from "./VaciarAlimentosPropios";
import { CrearAlimentoPropio } from "./CrearAlimentoPropio";
import { ActualizarAlimentoPropio } from "./ActualizarAlimentoPropio";
import { EliminarAlimentoPropio } from "./EliminarAlimentoPropio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorAlimentoPropioNoEncontrado } from "@/dominio/errores/ErrorAlimentoPropioNoEncontrado";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";

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

describe("CrearAlimentoPropio", () => {
  it("crea un alimento válido", async () => {
    const crear = vi.fn(async (a: AlimentoPropio) => a);
    const alimento = await new CrearAlimentoPropio(
      mockAlimentoPropioRepositorio({ crear }),
    ).ejecutar({ nombre: "Pollo", proteinasPor100: 27 });

    expect(alimento.aPrimitivos().nombre).toBe("Pollo");
    expect(crear).toHaveBeenCalledOnce();
  });

  it("rechaza un alimento sin nombre", async () => {
    await expect(
      new CrearAlimentoPropio(mockAlimentoPropioRepositorio()).ejecutar({
        nombre: "  ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("ActualizarAlimentoPropio", () => {
  it("lanza ErrorAlimentoPropioNoEncontrado si el alimento no existe", async () => {
    await expect(
      new ActualizarAlimentoPropio(
        mockAlimentoPropioRepositorio({
          obtenerPorId: vi.fn(async () => null),
        }),
      ).ejecutar("inexistente", { nombre: "x" }),
    ).rejects.toBeInstanceOf(ErrorAlimentoPropioNoEncontrado);
  });

  it("aplica los cambios sobre el alimento existente", async () => {
    const actualizar = vi.fn(async (a: AlimentoPropio) => a);
    const repo = mockAlimentoPropioRepositorio({
      obtenerPorId: vi.fn(async () => alimentoPropioEjemplo()),
      actualizar,
    });

    const resultado = await new ActualizarAlimentoPropio(repo).ejecutar(
      "ali-1",
      { caloriasPor100: 150 },
    );

    expect(resultado.aPrimitivos().caloriasPor100).toBe(150);
    expect(actualizar).toHaveBeenCalledOnce();
  });
});

describe("EliminarAlimentoPropio", () => {
  it("lanza ErrorAlimentoPropioNoEncontrado si el alimento no existe", async () => {
    await expect(
      new EliminarAlimentoPropio(
        mockAlimentoPropioRepositorio({
          obtenerPorId: vi.fn(async () => null),
        }),
      ).ejecutar("inexistente"),
    ).rejects.toBeInstanceOf(ErrorAlimentoPropioNoEncontrado);
  });

  it("elimina el alimento existente", async () => {
    const eliminar = vi.fn(async () => {});
    const repo = mockAlimentoPropioRepositorio({
      obtenerPorId: vi.fn(async () => alimentoPropioEjemplo()),
      eliminar,
    });

    await new EliminarAlimentoPropio(repo).ejecutar("ali-1");
    expect(eliminar).toHaveBeenCalledWith("ali-1");
  });
});

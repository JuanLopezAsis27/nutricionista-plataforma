import { describe, it, expect, vi } from "vitest";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { ErrorAlimentoDuplicado } from "@/dominio/errores/ErrorAlimentoDuplicado";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { CrearAlimentoPropio } from "./CrearAlimentoPropio";
import { ActualizarAlimentoPropio } from "./ActualizarAlimentoPropio";
import { ImportarAlimentos } from "./ImportarAlimentos";

/**
 * Tests de «un alimento no se carga dos veces» (migración 83).
 *
 * El mismo alimento es mismo nombre y marca, sin mayúsculas, tildes ni
 * espacios de más. Sirve igual a la lista del consultorio y al catálogo de la
 * plataforma: son los mismos casos de uso con otro repositorio.
 */

describe("claveIdentidad", () => {
  it("ignora mayúsculas, tildes y espacios de más", () => {
    const a = alimentoPropioEjemplo({ nombre: "Leche  Descremada " });
    const b = alimentoPropioEjemplo({ nombre: "léche descremada" });
    expect(a.claveIdentidad).toBe(b.claveIdentidad);
  });

  it("la marca es parte de la identidad", () => {
    const sinMarca = alimentoPropioEjemplo({ nombre: "Avena" });
    const quaker = alimentoPropioEjemplo({ nombre: "Avena", marca: "Quaker" });
    const otra = alimentoPropioEjemplo({ nombre: "Avena", marca: "Granix" });
    expect(
      new Set([sinMarca, quaker, otra].map((x) => x.claveIdentidad)).size,
    ).toBe(3);
  });
});

describe("CrearAlimentoPropio sin duplicados", () => {
  it("rechaza un alimento que ya está, nombrando al existente", async () => {
    const existente = alimentoPropioEjemplo({
      nombre: "Avena",
      marca: "Quaker",
    });
    const crear = vi.fn();
    const uc = new CrearAlimentoPropio(
      mockAlimentoPropioRepositorio({
        obtenerPorClave: vi.fn(async () => existente),
        crear,
      }),
    );

    const promesa = uc.ejecutar({ nombre: "avena ", marca: "QUAKER" });
    await expect(promesa).rejects.toBeInstanceOf(ErrorAlimentoDuplicado);
    await expect(promesa).rejects.toThrow(
      "«Avena (Quaker)» ya está en la lista.",
    );
    expect(crear).not.toHaveBeenCalled();
  });

  it("busca por la clave normalizada", async () => {
    const obtenerPorClave = vi.fn(async () => null);
    await new CrearAlimentoPropio(
      mockAlimentoPropioRepositorio({ obtenerPorClave }),
    ).ejecutar({ nombre: "Pollo  Grillado" });
    expect(obtenerPorClave).toHaveBeenCalledWith("pollo grillado|");
  });
});

describe("ActualizarAlimentoPropio sin duplicados", () => {
  it("no deja renombrar un alimento hasta chocar con otro", async () => {
    const actualizar = vi.fn();
    const uc = new ActualizarAlimentoPropio(
      mockAlimentoPropioRepositorio({
        obtenerPorId: vi.fn(async () => alimentoPropioEjemplo({}, "ali-1")),
        obtenerPorClave: vi.fn(async () =>
          alimentoPropioEjemplo({ nombre: "Fideos" }, "ali-2"),
        ),
        actualizar,
      }),
    );
    await expect(
      uc.ejecutar("ali-1", { nombre: "fideos" }),
    ).rejects.toBeInstanceOf(ErrorAlimentoDuplicado);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("corregir el propio nombre no es chocar consigo mismo", async () => {
    const actualizar = vi.fn(async (a: AlimentoPropio) => a);
    const uc = new ActualizarAlimentoPropio(
      mockAlimentoPropioRepositorio({
        obtenerPorId: vi.fn(async () =>
          alimentoPropioEjemplo({ nombre: "arroz" }, "ali-1"),
        ),
        obtenerPorClave: vi.fn(async () =>
          alimentoPropioEjemplo({ nombre: "arroz" }, "ali-1"),
        ),
        actualizar,
      }),
    );
    const resultado = await uc.ejecutar("ali-1", { nombre: "Arroz" });
    expect(resultado.aPrimitivos().nombre).toBe("Arroz");
    expect(actualizar).toHaveBeenCalledOnce();
  });
});

describe("ImportarAlimentos sin duplicados", () => {
  it("de las filas repetidas queda la última, y dice cuántas descartó", async () => {
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);
    const resultado = await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({ reemplazarTodos }),
    ).ejecutar([
      { nombre: "Arroz", caloriasPor100: 120 },
      { nombre: "Pollo", caloriasPor100: 165 },
      { nombre: "ARROZ ", caloriasPor100: 130 },
      { nombre: "Arroz", marca: "Gallo", caloriasPor100: 128 },
    ]);

    expect(resultado).toEqual({ importados: 3, repetidos: 1, enPlataforma: 0 });
    const guardados = reemplazarTodos.mock.calls[0]![0].map((a) =>
      a.aPrimitivos(),
    );
    // El orden es el de la primera aparición; los datos, los de la última.
    expect(guardados.map((a) => [a.nombre, a.marca, a.caloriasPor100])).toEqual(
      [
        ["ARROZ", null, 130],
        ["Pollo", null, 165],
        ["Arroz", "Gallo", 128],
      ],
    );
  });
});

import { describe, it, expect, vi } from "vitest";
import { Receta } from "@/dominio/entidades/Receta";
import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import { mockRecetaRepositorio } from "../_ayudas/repositorios";
import { CopiarRecetaBaseAlRecetario } from "./CopiarRecetaBaseAlRecetario";

/**
 * Tests de la copia de una receta de la plataforma al recetario.
 *
 * Es una COPIA (queda del consultorio, con `recetaBaseId`) y es IDEMPOTENTE:
 * elegirla dos veces desde el plan no puede llenar el recetario de duplicados.
 */

const base = Receta.crear(
  {
    nombre: "Budín de avena",
    porciones: 4,
    etiquetas: ["sin azúcar"],
    ingredientes: [
      { nombre: "Avena", cantidadGramos: 200, caloriasPor100: 380 },
    ],
  },
  "base-1",
);

function catalogo(receta: Receta | null): IRecetaBaseRepositorio {
  return {
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    obtenerPorId: vi.fn(async () => receta),
    listar: vi.fn(async () => []),
    contar: vi.fn(async () => 0),
    listarEtiquetas: vi.fn(async () => []),
  };
}

describe("CopiarRecetaBaseAlRecetario", () => {
  it("crea una copia del consultorio que recuerda de dónde salió", async () => {
    const recetario = mockRecetaRepositorio();
    const copia = await new CopiarRecetaBaseAlRecetario(
      catalogo(base),
      recetario,
    ).ejecutar("base-1");

    expect(recetario.crear).toHaveBeenCalledOnce();
    expect(copia.id).not.toBe("base-1");
    expect(copia.recetaBaseId).toBe("base-1");
    const p = copia.aPrimitivos();
    expect(p.nombre).toBe("Budín de avena");
    expect(p.etiquetas).toEqual(["sin azúcar"]);
    // Los macros por porción se recalculan de los ingredientes: 760 / 4.
    expect(p.calorias).toBe(190);
  });

  it("si ya la había copiado, devuelve esa copia y no crea otra", async () => {
    const existente = Receta.crear(
      { nombre: "Budín de avena (mío)", recetaBaseId: "base-1" },
      "rec-9",
    );
    const recetario = mockRecetaRepositorio({
      obtenerPorRecetaBase: vi.fn(async () => existente),
    });
    const copia = await new CopiarRecetaBaseAlRecetario(
      catalogo(base),
      recetario,
    ).ejecutar("base-1");

    expect(copia.id).toBe("rec-9");
    expect(recetario.crear).not.toHaveBeenCalled();
  });

  it("falla con NO_ENCONTRADO si la receta ya no está en el catálogo", async () => {
    await expect(
      new CopiarRecetaBaseAlRecetario(
        catalogo(null),
        mockRecetaRepositorio(),
      ).ejecutar("base-x"),
    ).rejects.toBeInstanceOf(ErrorRecetaNoEncontrada);
  });
});

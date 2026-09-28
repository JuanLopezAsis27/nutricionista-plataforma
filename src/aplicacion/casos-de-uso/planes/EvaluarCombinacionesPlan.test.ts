import { describe, it, expect, vi } from "vitest";
import { Receta } from "@/dominio/entidades/Receta";
import { mockRecetaRepositorio } from "../_ayudas/repositorios";
import { EvaluarCombinacionesPlan } from "./EvaluarCombinacionesPlan";

/**
 * Tests de la evaluación del borrador del plan.
 *
 * Fijan la respuesta a «alimentos sueltos + una receta que ya tiene los
 * suyos»: la receta suma por sus macros por porción (calculados de SUS
 * ingredientes al guardarla) y sus ingredientes no se vuelven a sumar; un
 * alimento suelto que también está en la receta sí suma, pero se avisa.
 */

// 2 porciones; ingredientes: 200 g de arroz (130 kcal/100) + 100 g de huevo
// (155 kcal/100) → 415 kcal totales → 208 kcal por porción.
const tortilla = Receta.crear(
  {
    nombre: "Tortilla de arroz",
    porciones: 2,
    ingredientes: [
      {
        nombre: "Arroz blanco cocido",
        cantidadGramos: 200,
        caloriasPor100: 130,
      },
      { nombre: "Huevo", cantidadGramos: 100, caloriasPor100: 155 },
    ],
  },
  "rec-1",
);

function casoDeUso() {
  const recetas = mockRecetaRepositorio({
    obtenerPorId: vi.fn(async (id: string) =>
      id === "rec-1" ? tortilla : null,
    ),
  });
  return { uc: new EvaluarCombinacionesPlan(recetas), recetas };
}

const metas = {
  calorias: 500,
  proteinasG: null,
  carbohidratosG: null,
  grasasG: null,
};

describe("EvaluarCombinacionesPlan", () => {
  it("suma la receta por porción y los alimentos, sin repetir los ingredientes", async () => {
    const { uc } = casoDeUso();
    const resultado = await uc.ejecutar({
      metas,
      comidas: [
        {
          nombre: "Almuerzo",
          opciones: [
            {
              recetaId: "rec-1",
              porciones: 2,
              items: [
                { nombre: "Manzana", cantidadGramos: 100, caloriasPor100: 52 },
              ],
            },
          ],
        },
      ],
    });
    const porPorcion = tortilla.aPrimitivos().calorias!;
    // Receta × 2 + manzana. Si sumara los ingredientes de nuevo, sumaría
    // además los 415 kcal de la receta entera.
    expect(resultado.mejores[0]!.macros.calorias).toBe(porPorcion * 2 + 52);
    expect(resultado.avisos).toEqual([]);
  });

  it("avisa cuando un alimento suelto ya es ingrediente de la receta", async () => {
    const { uc } = casoDeUso();
    const resultado = await uc.ejecutar({
      metas,
      comidas: [
        {
          nombre: "Almuerzo",
          opciones: [
            { items: [{ nombre: "Tostadas", cantidadGramos: 50 }] },
            {
              recetaId: "rec-1",
              items: [
                { nombre: "huevo", cantidadGramos: 50, caloriasPor100: 155 },
              ],
            },
          ],
        },
      ],
    });
    expect(resultado.avisos).toEqual([
      {
        franja: "Almuerzo",
        opcion: 2,
        alimento: "huevo",
        receta: "Tortilla de arroz",
      },
    ]);
  });

  it("lee cada receta una sola vez aunque se repita en varias opciones", async () => {
    const { uc, recetas } = casoDeUso();
    await uc.ejecutar({
      metas,
      comidas: [
        { nombre: "Almuerzo", opciones: [{ recetaId: "rec-1" }] },
        { nombre: "Cena", opciones: [{ recetaId: "rec-1" }] },
      ],
    });
    expect(recetas.obtenerPorId).toHaveBeenCalledTimes(1);
  });

  it("una receta que ya no existe no aporta y no rompe la evaluación", async () => {
    const { uc } = casoDeUso();
    const resultado = await uc.ejecutar({
      metas,
      comidas: [
        {
          nombre: "Almuerzo",
          opciones: [
            {
              recetaId: "rec-borrada",
              items: [
                { nombre: "Pan", cantidadGramos: 100, caloriasPor100: 250 },
              ],
            },
          ],
        },
      ],
    });
    expect(resultado.mejores[0]!.macros.calorias).toBe(250);
  });
});

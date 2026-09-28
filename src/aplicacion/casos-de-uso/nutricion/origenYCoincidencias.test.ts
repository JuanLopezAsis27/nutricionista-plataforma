import { describe, it, expect, vi } from "vitest";
import { Receta } from "@/dominio/entidades/Receta";
import { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";
import { ImportarAlimentos } from "./ImportarAlimentos";
import { BuscarCoincidenciaEnCatalogo } from "./BuscarCoincidenciaEnCatalogo";
import { ContarUsosDeAlimento } from "./ContarUsosDeAlimento";

/**
 * Tests de las coincidencias con el catálogo de la plataforma y del origen de
 * los alimentos copiados (migración 85).
 *
 * Fijan que coincidir con la plataforma es un AVISO y nunca un bloqueo (la
 * versión propia es legítima), y que la copia de un alimento recuerda de cuál
 * salió sin depender de él.
 */

describe("coincidencias con la plataforma", () => {
  it("la importación cuenta las filas que ya están en la plataforma, sin descartarlas", async () => {
    const reemplazarTodos = vi.fn(async (a: unknown[]) => a.length);
    const catalogo = mockAlimentoPropioRepositorio({
      clavesExistentes: vi.fn(async (claves: string[]) =>
        claves.filter((c) => c.startsWith("avena")),
      ),
    });
    const resultado = await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({ reemplazarTodos }),
      catalogo,
    ).ejecutar([{ nombre: "Avena", marca: "Quaker" }, { nombre: "Tofu" }]);

    expect(resultado).toEqual({ importados: 2, repetidos: 0, enPlataforma: 1 });
    expect(catalogo.clavesExistentes).toHaveBeenCalledWith([
      "avena|quaker",
      "tofu|",
    ]);
  });

  it("al importar el catálogo mismo no hay con qué comparar", async () => {
    const resultado = await new ImportarAlimentos(
      mockAlimentoPropioRepositorio(),
    ).ejecutar([{ nombre: "Tofu" }]);
    expect(resultado.enPlataforma).toBe(0);
  });

  it("busca la coincidencia con la misma identidad que el control de duplicados", async () => {
    const existente = alimentoPropioEjemplo({ nombre: "Yogur", marca: "Ser" });
    const obtenerPorClave = vi.fn(async () => existente);
    const coincidencia = await new BuscarCoincidenciaEnCatalogo(
      mockAlimentoPropioRepositorio({ obtenerPorClave }),
    ).ejecutar("  yógur ", "SER");

    expect(obtenerPorClave).toHaveBeenCalledWith("yogur|ser");
    expect(coincidencia?.etiqueta).toBe("Yogur (Ser)");
  });

  it("sin nombre no consulta", async () => {
    const obtenerPorClave = vi.fn();
    expect(
      await new BuscarCoincidenciaEnCatalogo(
        mockAlimentoPropioRepositorio({ obtenerPorClave }),
      ).ejecutar("   ", null),
    ).toBeNull();
    expect(obtenerPorClave).not.toHaveBeenCalled();
  });
});

describe("origen de los alimentos copiados", () => {
  it("el ingrediente de una receta recuerda de qué alimento salió", () => {
    const receta = Receta.crear(
      {
        nombre: "Budín",
        ingredientes: [
          { nombre: "Avena", cantidadGramos: 100, alimentoOrigenId: "ali-9" },
          { nombre: "Agua", cantidadGramos: 200 },
        ],
      },
      "rec-1",
    );
    const [avena, agua] = receta.aPrimitivos().ingredientes;
    expect(avena!.alimentoOrigenId).toBe("ali-9");
    expect(agua!.alimentoOrigenId).toBeNull();
  });

  it("el alimento de una opción del plan lo recuerda, también al clonar el plan", () => {
    const plan = PlanNutricional.crear(
      {
        nombre: "Plan",
        comidas: [
          {
            nombre: "Desayuno",
            opciones: [
              {
                items: [
                  {
                    nombre: "Avena",
                    cantidadGramos: 50,
                    alimentoOrigenId: "ali-9",
                  },
                ],
              },
            ],
          },
        ],
      },
      "plan-1",
      () => crypto.randomUUID(),
    );
    const clon = plan.clonar("plan-2", () => crypto.randomUUID(), {
      esPlantilla: false,
    });
    expect(clon.comidas[0]!.opciones[0]!.items[0]!.alimentoOrigenId).toBe(
      "ali-9",
    );
  });

  it("contar usos delega en el repositorio", async () => {
    const usos = {
      planes: 2,
      recetas: 1,
      planesSemanales: 0,
      recetasPlataforma: 0,
      consultorios: 1,
    };
    const contar = vi.fn(async () => usos);
    expect(await new ContarUsosDeAlimento({ contar }).ejecutar("ali-9")).toBe(
      usos,
    );
    expect(contar).toHaveBeenCalledWith("ali-9");
  });
});

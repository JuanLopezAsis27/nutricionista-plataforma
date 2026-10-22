import { describe, it, expect, vi } from "vitest";
import {
  describirCantidad,
  medidasDesdeTexto,
  medidasDisponibles,
  normalizarCantidadDeAlimento,
  normalizarMedidas,
  unidadBaseDesdeTexto,
} from "@/dominio/entidades/medidasAlimento";
import { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { Receta } from "@/dominio/entidades/Receta";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { sumarPorGramos } from "@/dominio/servicios/macrosAlimentos";
import { ImportarAlimentos } from "./ImportarAlimentos";
import {
  mockAlimentoPropioRepositorio,
  alimentoPropioEjemplo,
} from "../_ayudas-test";

/**
 * Tests de las medidas de los alimentos (migración 90).
 *
 * Lo que fijan: que con una medida elegida los g/ml SALEN de la medida (y no
 * de lo que mande la pantalla), que la suma de macros no cambia —un alimento
 * en ml se suma igual que uno en g, por 100 de su unidad—, que la planilla
 * entiende las medidas escritas de varias maneras, y que reimportar no borra
 * las medidas cargadas a mano.
 */

describe("normalizarCantidadDeAlimento", () => {
  it("sin medida, la cantidad es la de siempre, en gramos", () => {
    expect(
      normalizarCantidadDeAlimento({ cantidadGramos: 150 }, "Arroz"),
    ).toEqual({
      cantidadGramos: 150,
      unidadBase: "GRAMO",
      medidas: [],
      medida: null,
      cantidadMedida: null,
      cantidadPorMedida: null,
    });
  });

  it("con medida, los g/ml salen de cantidad × equivalencia y pisan lo que vino", () => {
    const cantidad = normalizarCantidadDeAlimento(
      {
        cantidadGramos: 999, // la pantalla mandó otra cosa: no manda
        unidadBase: "MILILITRO",
        medida: "cucharada",
        cantidadMedida: 2,
        cantidadPorMedida: 15,
      },
      "Aceite",
    );
    expect(cantidad.cantidadGramos).toBe(30);
    expect(cantidad.unidadBase).toBe("MILILITRO");
    expect(cantidad.medida).toBe("cucharada");
  });

  it("una medida sin equivalencia no se puede guardar", () => {
    expect(() =>
      normalizarCantidadDeAlimento(
        { medida: "taza", cantidadMedida: 1 },
        "Leche",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("los macros de un líquido se suman por 100 ml igual que por 100 g", () => {
    // 1 taza (240 ml) de leche a 35 kcal / 100 ml = 84 kcal.
    const leche = {
      ...normalizarCantidadDeAlimento(
        {
          unidadBase: "MILILITRO",
          medida: "taza",
          cantidadMedida: 1,
          cantidadPorMedida: 240,
        },
        "Leche",
      ),
      caloriasPor100: 35,
      proteinasPor100: 3.4,
      carbohidratosPor100: null,
      grasasPor100: null,
    };
    expect(sumarPorGramos([leche]).calorias).toBe(84);
    expect(sumarPorGramos([leche]).proteinasG).toBe(8.2);
  });

  it("la receta guarda el ingrediente con su medida", () => {
    const receta = Receta.crear(
      {
        nombre: "Panqueques",
        porciones: 2,
        ingredientes: [
          {
            nombre: "Huevo",
            medida: "unidad",
            cantidadMedida: 2,
            cantidadPorMedida: 50,
            medidas: [{ nombre: "unidad", cantidad: 50 }],
            caloriasPor100: 143,
          },
        ],
      },
      "r-1",
    );
    const [huevo] = receta.aPrimitivos().ingredientes;
    expect(huevo!.cantidadGramos).toBe(100);
    expect(receta.aPrimitivos().calorias).toBe(72); // 143 / 2 porciones
  });
});

describe("describirCantidad", () => {
  it("dice la medida y su equivalencia, con el plural de la primera palabra", () => {
    expect(
      describirCantidad({
        cantidadGramos: 30,
        unidadBase: "MILILITRO",
        medida: "cucharada",
        cantidadMedida: 2,
      }),
    ).toBe("2 cucharadas (30 ml)");
    expect(
      describirCantidad({
        cantidadGramos: 100,
        unidadBase: "GRAMO",
        medida: "unidad",
        cantidadMedida: 2,
      }),
    ).toBe("2 unidades (100 g)");
    expect(
      describirCantidad({
        cantidadGramos: 120,
        unidadBase: "MILILITRO",
        medida: "taza",
        cantidadMedida: 0.5,
      }),
    ).toBe("0,5 taza (120 ml)");
  });

  it("sin medida es la cantidad en g o ml; sin cantidad, null", () => {
    expect(describirCantidad({ cantidadGramos: 150 })).toBe("150 g");
    expect(
      describirCantidad({ cantidadGramos: 200, unidadBase: "MILILITRO" }),
    ).toBe("200 ml");
    expect(describirCantidad({ cantidadGramos: null })).toBeNull();
  });

  it("no pluraliza abreviaturas", () => {
    expect(
      describirCantidad({
        cantidadGramos: 2000,
        unidadBase: "GRAMO",
        medida: "kg",
        cantidadMedida: 2,
      }),
    ).toBe("2 kg (2000 g)");
  });
});

describe("medidas del alimento", () => {
  it("las estándar de volumen son solo de los líquidos", () => {
    const enMl = medidasDisponibles("MILILITRO", []).map((m) => m.nombre);
    expect(enMl).toContain("cucharada");
    expect(enMl).toContain("litro");
    const enG = medidasDisponibles("GRAMO", []).map((m) => m.nombre);
    expect(enG).not.toContain("cucharada");
  });

  it("una propia pisa a la estándar del mismo nombre", () => {
    const medidas = medidasDisponibles("MILILITRO", [
      { nombre: "Vaso", cantidad: 250 },
    ]);
    expect(medidas.filter((m) => m.nombre.toLowerCase() === "vaso")).toEqual([
      { nombre: "Vaso", cantidad: 250 },
    ]);
  });

  it("normalizar descarta repetidas (queda la última) y rechaza cantidades inválidas", () => {
    expect(
      normalizarMedidas(
        [
          { nombre: "taza", cantidad: 200 },
          { nombre: " Taza ", cantidad: 240 },
        ],
        "Leche",
      ),
    ).toEqual([{ nombre: "Taza", cantidad: 240 }]);
    expect(() =>
      normalizarMedidas([{ nombre: "taza", cantidad: 0 }], "Leche"),
    ).toThrow(ErrorValidacion);
  });

  it("el alimento guarda su unidad y sus medidas", () => {
    const leche = AlimentoPropio.crear(
      {
        nombre: "Leche",
        unidadBase: "MILILITRO",
        medidas: [{ nombre: "taza", cantidad: 240 }],
      },
      "a-1",
    );
    expect(leche.aPrimitivos().unidadBase).toBe("MILILITRO");
    expect(leche.aPrimitivos().medidas).toEqual([
      { nombre: "taza", cantidad: 240 },
    ]);
    // Sin decirlo, gramos.
    expect(
      AlimentoPropio.crear({ nombre: "Arroz" }, "a-2").aPrimitivos().unidadBase,
    ).toBe("GRAMO");
  });
});

describe("la planilla", () => {
  it("reconoce la unidad escrita de varias maneras", () => {
    expect(unidadBaseDesdeTexto("g")).toBe("GRAMO");
    expect(unidadBaseDesdeTexto("Gramos")).toBe("GRAMO");
    expect(unidadBaseDesdeTexto("100 g")).toBe("GRAMO");
    expect(unidadBaseDesdeTexto("ml")).toBe("MILILITRO");
    expect(unidadBaseDesdeTexto("cc")).toBe("MILILITRO");
    expect(unidadBaseDesdeTexto("cm3")).toBe("MILILITRO");
    expect(unidadBaseDesdeTexto("Mililitros")).toBe("MILILITRO");
    expect(unidadBaseDesdeTexto("")).toBeNull();
    expect(unidadBaseDesdeTexto("paquete")).toBeNull();
  });

  it("entiende las medidas en sus formatos habituales y descarta lo que no", () => {
    expect(
      medidasDesdeTexto(
        "1 taza = 240; vaso: 200 ml | 1 cucharada (15 ml); 2 unidades = 100; cualquier cosa",
      ),
    ).toEqual([
      { nombre: "taza", cantidad: 240 },
      { nombre: "vaso", cantidad: 200 },
      { nombre: "cucharada", cantidad: 15 },
      { nombre: "unidad", cantidad: 50 },
    ]);
    expect(medidasDesdeTexto("rodaja = 12,5")).toEqual([
      { nombre: "rodaja", cantidad: 12.5 },
    ]);
    expect(medidasDesdeTexto("")).toEqual([]);
  });

  it("reimportar conserva la unidad y las medidas si la planilla no las trae", async () => {
    const anterior = alimentoPropioEjemplo({ nombre: "Leche" }).actualizar({
      unidadBase: "MILILITRO",
      medidas: [{ nombre: "taza", cantidad: 240 }],
    });
    const reemplazarTodos = vi.fn(async (a: AlimentoPropio[]) => a.length);

    await new ImportarAlimentos(
      mockAlimentoPropioRepositorio({
        listar: vi.fn(async () => [anterior]),
        reemplazarTodos,
      }),
    ).ejecutar([
      { nombre: "leche", caloriasPor100: 35, unidadBase: null, medidas: [] },
      {
        nombre: "Yogur",
        unidadBase: "MILILITRO",
        medidas: [{ nombre: "pote", cantidad: 190 }],
      },
    ]);

    const [leche, yogur] = reemplazarTodos.mock.calls[0]![0];
    expect(leche!.aPrimitivos().unidadBase).toBe("MILILITRO");
    expect(leche!.aPrimitivos().medidas).toEqual([
      { nombre: "taza", cantidad: 240 },
    ]);
    expect(leche!.aPrimitivos().caloriasPor100).toBe(35);
    expect(yogur!.aPrimitivos().medidas).toEqual([
      { nombre: "pote", cantidad: 190 },
    ]);
  });
});

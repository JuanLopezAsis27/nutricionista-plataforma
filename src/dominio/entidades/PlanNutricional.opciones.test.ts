import { describe, it, expect } from "vitest";
import {
  PlanNutricional,
  macrosDeOpcion,
  descripcionDeOpcion,
  type DatosOpcionPlan,
} from "./PlanNutricional";
import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Tests de las opciones del plan con receta, porciones y alimentos sueltos
 * (migración 82), y de los tipos de meta.
 *
 * La regla central es la respuesta a «¿y si cargo alimentos Y una receta que
 * ya tiene sus alimentos?»: se suman, pero la receta entra por sus macros por
 * porción y NUNCA por sus ingredientes sueltos.
 */

let n = 0;
const generarId = () => `id-${++n}`;

function planCon(opciones: DatosOpcionPlan[], extra = {}) {
  return PlanNutricional.crear(
    {
      nombre: "Plan",
      comidas: [{ nombre: "Almuerzo", opciones }],
      ...extra,
    },
    "plan-1",
    generarId,
  );
}

const banana = {
  nombre: "Banana",
  cantidadGramos: 200,
  caloriasPor100: 90,
  proteinasPor100: 1,
  carbohidratosPor100: 23,
  grasasPor100: 0.5,
};

describe("opciones del plan", () => {
  it("una opción vale solo con alimentos, sin texto", () => {
    const plan = planCon([{ items: [banana] }]);
    const opcion = plan.comidas[0]!.opciones[0]!;
    expect(opcion.contenido).toBe("");
    expect(opcion.items).toHaveLength(1);
  });

  it("una opción vale solo con una receta", () => {
    const plan = planCon([{ recetaId: "rec-1", porciones: 2 }]);
    expect(plan.comidas[0]!.opciones[0]!.porciones).toBe(2);
  });

  it("una opción sin texto, receta ni alimentos no es una opción", () => {
    expect(() => planCon([{ contenido: "  " }])).toThrow(ErrorValidacion);
  });

  it("sin receta, las porciones se descartan", () => {
    const plan = planCon([{ contenido: "Ensalada", porciones: 3 }]);
    expect(plan.comidas[0]!.opciones[0]!.porciones).toBeNull();
  });

  it("rechaza porciones no positivas y alimentos sin nombre o negativos", () => {
    expect(() => planCon([{ recetaId: "rec-1", porciones: 0 }])).toThrow(
      ErrorValidacion,
    );
    expect(() => planCon([{ items: [{ ...banana, nombre: " " }] }])).toThrow(
      ErrorValidacion,
    );
    expect(() =>
      planCon([{ items: [{ ...banana, cantidadGramos: -1 }] }]),
    ).toThrow(ErrorValidacion);
  });

  it("el clon copia receta, porciones, alimentos y tipos de meta", () => {
    const original = planCon(
      [{ recetaId: "rec-1", porciones: 1.5, items: [banana] }],
      {
        proteinasMetaG: 120,
        tiposMeta: { proteinasG: "MINIMO" },
      },
    );
    const clon = original.clonar("plan-2", generarId, { esPlantilla: false });
    const opcion = clon.comidas[0]!.opciones[0]!;
    expect(opcion.recetaId).toBe("rec-1");
    expect(opcion.porciones).toBe(1.5);
    expect(opcion.items[0]!.nombre).toBe("Banana");
    expect(clon.tiposMeta.proteinasG).toBe("MINIMO");
    expect(clon.tiposMeta.calorias).toBe("APROXIMADO");
  });
});

describe("macrosDeOpcion", () => {
  const receta = {
    calorias: 400,
    proteinasG: 30,
    carbohidratosG: 40,
    grasasG: 10,
  };

  it("suma la receta por sus porciones más los alimentos sueltos", () => {
    const macros = macrosDeOpcion({
      recetaMacros: receta,
      porciones: 2,
      items: [
        {
          ...banana,
          fuente: null,
          referenciaExterna: null,
          alimentoOrigenId: null,
        },
      ],
    });
    // Receta × 2 = 800 kcal; banana 200 g = 180 kcal.
    expect(macros.calorias).toBe(980);
    expect(macros.proteinasG).toBe(62);
  });

  it("sin porciones cargadas, la receta vale una", () => {
    expect(
      macrosDeOpcion({ recetaMacros: receta, porciones: null, items: [] })
        .calorias,
    ).toBe(400);
  });

  it("una receta sin macros no borra lo que aportan los alimentos", () => {
    const macros = macrosDeOpcion({
      recetaMacros: {
        calorias: null,
        proteinasG: null,
        carbohidratosG: null,
        grasasG: null,
      },
      porciones: 1,
      items: [
        {
          ...banana,
          fuente: null,
          referenciaExterna: null,
          alimentoOrigenId: null,
        },
      ],
    });
    expect(macros.calorias).toBe(180);
  });
});

describe("descripcionDeOpcion", () => {
  it("usa el texto del profesional cuando lo hay", () => {
    expect(
      descripcionDeOpcion({
        contenido: "Milanesa con puré",
        recetaNombre: "Milanesa",
        porciones: 1,
        items: [],
      }),
    ).toBe("Milanesa con puré");
  });

  it("sin texto, describe la receta y los alimentos", () => {
    expect(
      descripcionDeOpcion({
        contenido: "",
        recetaNombre: "Tarta de acelga",
        porciones: 2,
        items: [{ nombre: "Manzana", cantidadGramos: 150 }],
      }),
    ).toBe("Tarta de acelga (2 porciones) + Manzana (150 g)");
  });
});

describe("metasDiarias", () => {
  it("es null si el plan no declara ninguna meta", () => {
    expect(planCon([{ contenido: "x" }]).metasDiarias).toBeNull();
  });

  it("viaja con el tipo de cada meta", () => {
    const plan = planCon([{ contenido: "x" }], {
      grasasMetaG: 60,
      tiposMeta: { grasasG: "MAXIMO" },
    });
    expect(plan.metasDiarias?.grasasG).toBe(60);
    expect(plan.metasDiarias?.tipos?.grasasG).toBe("MAXIMO");
  });
});

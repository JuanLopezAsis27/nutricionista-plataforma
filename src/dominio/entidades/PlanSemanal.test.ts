import { describe, it, expect } from "vitest";
import {
  PlanSemanal,
  diaSemanaDe,
  type DatosNuevoPlanSemanal,
} from "./PlanSemanal";
import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Tests del plan semanal.
 *
 * Lo que protegen, en orden de importancia:
 *
 *  1. **El total del día suma la comida PRINCIPAL de cada franja, no todas.**
 *     Es la regla que hace comparable el menú contra las metas del paciente, y
 *     la que se rompe sola en cuanto alguien "arregla" el cálculo sumando el
 *     array entero: un lunes con tres almuerzos daría el triple de calorías y
 *     nadie lo notaría hasta ver el semáforo en rojo.
 *  2. **Las celdas vacías se descartan.** La grilla manda las 42 siempre.
 *  3. Los macros de una comida son alimentos MÁS receta por sus porciones.
 */

let contador = 0;
const generarId = () => `id-${++contador}`;

function crear(datos: Partial<DatosNuevoPlanSemanal> = {}): PlanSemanal {
  contador = 0;
  return PlanSemanal.crear(
    {
      nombre: "Semana tipo",
      franjas: [
        {
          nombre: "Almuerzo",
          comidas: [
            {
              dia: "LUNES",
              descripcion: "Carne con verduras",
              items: [
                {
                  nombre: "Carne",
                  cantidadGramos: 100,
                  caloriasPor100: 200,
                  proteinasPor100: 26,
                },
              ],
            },
          ],
        },
      ],
      ...datos,
    },
    "sem-1",
    generarId,
  );
}

describe("PlanSemanal.crear", () => {
  it("exige nombre, franjas y al menos una comida cargada", () => {
    expect(() => crear({ nombre: "  " })).toThrow(ErrorValidacion);
    expect(() => crear({ franjas: [] })).toThrow(ErrorValidacion);
    expect(() => crear({ franjas: [{ nombre: "Cena", comidas: [] }] })).toThrow(
      ErrorValidacion,
    );
  });

  it("descarta las celdas vacías en vez de guardarlas", () => {
    // La grilla manda los siete días de cada franja aunque estén en blanco:
    // si se guardaran, un plan con una comida traería 41 filas fantasma.
    const plan = crear({
      franjas: [
        {
          nombre: "Cena",
          comidas: [
            { dia: "LUNES", descripcion: "Sopa" },
            { dia: "MARTES", descripcion: "   " },
            { dia: "MIERCOLES", items: [] },
          ],
        },
      ],
    });
    expect(plan.franjas[0]!.comidas).toHaveLength(1);
    expect(plan.franjas[0]!.comidas[0]!.dia).toBe("LUNES");
  });

  it("numera el orden por DÍA, no por franja", () => {
    // El orden 0 es «la principal de esta celda». Si se numerara por franja,
    // la comida del martes arrancaría en 1 y no sumaría al martes.
    const plan = crear({
      franjas: [
        {
          nombre: "Almuerzo",
          comidas: [
            { dia: "LUNES", descripcion: "Opción A" },
            { dia: "LUNES", descripcion: "Opción B" },
            { dia: "MARTES", descripcion: "Milanesa" },
          ],
        },
      ],
    });
    const ordenes = plan.franjas[0]!.comidas.map((c) => [c.dia, c.orden]);
    expect(ordenes).toEqual([
      ["LUNES", 0],
      ["LUNES", 1],
      ["MARTES", 0],
    ]);
  });

  it("rechaza horas mal formadas y cantidades negativas", () => {
    expect(() =>
      crear({
        franjas: [
          {
            nombre: "Cena",
            horaDesde: "25:00",
            comidas: [{ dia: "LUNES", descripcion: "Sopa" }],
          },
        ],
      }),
    ).toThrow(ErrorValidacion);

    expect(() =>
      crear({
        franjas: [
          {
            nombre: "Cena",
            comidas: [
              {
                dia: "LUNES",
                items: [{ nombre: "Arroz", cantidadGramos: -50 }],
              },
            ],
          },
        ],
      }),
    ).toThrow(ErrorValidacion);
  });
});

describe("PlanSemanal.totalesPorDia", () => {
  it("suma la comida principal de cada franja y NO las alternativas", () => {
    const plan = crear({
      franjas: [
        {
          nombre: "Almuerzo",
          comidas: [
            {
              dia: "LUNES",
              descripcion: "Principal",
              items: [
                { nombre: "Carne", cantidadGramos: 100, caloriasPor100: 200 },
              ],
            },
            {
              dia: "LUNES",
              descripcion: "Alternativa",
              items: [
                { nombre: "Tarta", cantidadGramos: 100, caloriasPor100: 500 },
              ],
            },
          ],
        },
        {
          nombre: "Cena",
          comidas: [
            {
              dia: "LUNES",
              descripcion: "Ensalada",
              items: [
                { nombre: "Pollo", cantidadGramos: 100, caloriasPor100: 150 },
              ],
            },
          ],
        },
      ],
    });

    const lunes = plan.totalesPorDia().find((d) => d.dia === "LUNES")!;
    // 200 (almuerzo principal) + 150 (cena). La alternativa de 500 no entra.
    expect(lunes.macros.calorias).toBe(350);
  });

  it("devuelve los siete días, con los vacíos en null", () => {
    const plan = crear();
    const totales = plan.totalesPorDia();
    expect(totales).toHaveLength(7);
    const domingo = totales.find((d) => d.dia === "DOMINGO")!;
    // Sin comidas no hay dato: null y no 0, que se leería como "comió nada".
    expect(domingo.macros.calorias).toBeNull();
  });

  it("un macro sin dato no borra el del resto del día", () => {
    const plan = crear({
      franjas: [
        {
          nombre: "Desayuno",
          comidas: [
            {
              dia: "LUNES",
              items: [
                {
                  nombre: "Pan",
                  cantidadGramos: 100,
                  caloriasPor100: 250,
                  proteinasPor100: 9,
                },
              ],
            },
          ],
        },
        {
          nombre: "Almuerzo",
          comidas: [
            {
              dia: "LUNES",
              items: [
                { nombre: "Sopa", cantidadGramos: 200, caloriasPor100: 30 },
              ],
            },
          ],
        },
      ],
    });

    const lunes = plan.totalesPorDia().find((d) => d.dia === "LUNES")!;
    expect(lunes.macros.calorias).toBe(310);
    // La sopa no declara proteínas: las del pan siguen contando.
    expect(lunes.macros.proteinasG).toBe(9);
    // Nadie declaró grasas: sigue siendo "sin dato".
    expect(lunes.macros.grasasG).toBeNull();
  });
});

describe("PlanSemanal.macrosDe", () => {
  it("suma los alimentos y la receta escalada por sus porciones", () => {
    const plan = crear({
      franjas: [
        {
          nombre: "Cena",
          comidas: [
            {
              dia: "LUNES",
              recetaId: "rec-1",
              porciones: 2,
              items: [
                { nombre: "Fruta", cantidadGramos: 100, caloriasPor100: 50 },
              ],
            },
          ],
        },
      ],
    });

    // Los macros de la receta los completa el repositorio al leer; acá se
    // reconstruye el plan con ellos puestos, que es como llega de la base.
    const props = plan.aPrimitivos();
    props.franjas[0]!.comidas[0]!.recetaMacros = {
      calorias: 300,
      proteinasG: 20,
      carbohidratosG: null,
      grasasG: null,
    };
    const conReceta = PlanSemanal.reconstruir(props);
    const comida = conReceta.franjas[0]!.comidas[0]!;

    // 50 (fruta) + 300 × 2 porciones.
    expect(PlanSemanal.macrosDe(comida).calorias).toBe(650);
    expect(PlanSemanal.macrosDe(comida).proteinasG).toBe(40);
  });
});

describe("PlanSemanal.actualizar", () => {
  it("reemplaza la grilla y preserva id y creadoEn", () => {
    const plan = crear();
    const antes = plan.aPrimitivos();
    const actualizado = plan.actualizar(
      {
        nombre: "Semana 2",
        franjas: [
          {
            nombre: "Cena",
            comidas: [{ dia: "VIERNES", descripcion: "Pizza casera" }],
          },
        ],
      },
      generarId,
      new Date("2026-08-01T10:00:00Z"),
    );
    const despues = actualizado.aPrimitivos();

    expect(despues.id).toBe(antes.id);
    expect(despues.creadoEn).toEqual(antes.creadoEn);
    expect(despues.nombre).toBe("Semana 2");
    expect(despues.franjas).toHaveLength(1);
    expect(despues.franjas[0]!.comidas[0]!.dia).toBe("VIERNES");
  });
});

/**
 * El corrimiento entre el calendario y la grilla.
 *
 * `getDay()` cuenta desde el DOMINGO y `DIAS_SEMANA` desde el LUNES. Errarle
 * por uno no rompe nada visible: el paciente ve un menú completo y prolijo,
 * solo que el del día equivocado. Por eso se congelan los dos extremos —el
 * domingo, que es el que se corre de punta a punta, y el lunes, que es el 0
 * de la grilla— y no un día cualquiera del medio.
 */
describe("diaSemanaDe", () => {
  it("mapea cada fecha al día de la grilla, que empieza en lunes", () => {
    // 2026-08-31 fue lunes; se recorre la semana completa desde ahí.
    const esperados = [
      "LUNES",
      "MARTES",
      "MIERCOLES",
      "JUEVES",
      "VIERNES",
      "SABADO",
      "DOMINGO",
    ] as const;

    esperados.forEach((esperado, indice) => {
      const fecha = new Date(2026, 7, 31 + indice, 12, 0, 0);
      expect(diaSemanaDe(fecha)).toBe(esperado);
    });
  });

  it("manda el domingo al final de la semana, no al principio", () => {
    expect(diaSemanaDe(new Date(2026, 8, 6, 12, 0, 0))).toBe("DOMINGO");
  });
});

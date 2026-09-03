import { describe, it, expect } from "vitest";
import { esquema } from "./FormularioPlanSemanal";
import { crearPlanSemanalDto } from "@/aplicacion/dtos/planSemanal.dto";
import { SIN_RECETA } from "./formulario/esquema";

/**
 * Coherencia formulario ↔ DTO del plan semanal.
 *
 * La misma regla direccional que en `coherencia-formularios-2.test.ts`: el
 * formulario puede ser MÁS estricto que el servidor, nunca menos. Cuando es
 * menos, la pantalla da por bueno un valor que la mutación después rechaza, y
 * el profesional ve un error que contradice lo que acaba de aceptar el campo.
 */

const base = {
  nombre: "Semana tipo",
  descripcion: "",
  franjas: [
    {
      nombre: "Almuerzo",
      horaDesde: "",
      horaHasta: "",
      comidas: [
        {
          dia: "LUNES" as const,
          descripcion: "Carne con verduras",
          recetaId: SIN_RECETA,
          porciones: "",
          items: [],
        },
      ],
    },
  ],
};

describe("FormularioPlanSemanal vs crearPlanSemanalDto", () => {
  it("acepta una grilla mínima válida en los dos lados", () => {
    expect(esquema.safeParse(base).success).toBe(true);
    expect(
      crearPlanSemanalDto.safeParse({
        nombre: "Semana tipo",
        franjas: [
          {
            nombre: "Almuerzo",
            comidas: [{ dia: "LUNES", descripcion: "Carne con verduras" }],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("exige al menos una comida cargada, igual que la entidad", () => {
    // Sin esto, un plan con la grilla entera en blanco pasaba la pantalla y
    // moría en el servidor con un error de dominio.
    const vacio = {
      ...base,
      franjas: [
        { nombre: "Almuerzo", horaDesde: "", horaHasta: "", comidas: [] },
      ],
    };
    expect(esquema.safeParse(vacio).success).toBe(false);
  });

  it("rechaza una hora mal formada en los dos lados", () => {
    expect(
      esquema.safeParse({
        ...base,
        franjas: [{ ...base.franjas[0]!, horaDesde: "25:00" }],
      }).success,
    ).toBe(false);
    expect(
      crearPlanSemanalDto.safeParse({
        nombre: "X",
        franjas: [
          {
            nombre: "Almuerzo",
            horaDesde: "25:00",
            comidas: [{ dia: "LUNES", descripcion: "algo" }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("respeta los mismos topes de macros por 100 g", () => {
    const conMacroExcesivo = {
      ...base,
      franjas: [
        {
          ...base.franjas[0]!,
          comidas: [
            {
              ...base.franjas[0]!.comidas[0]!,
              items: [
                {
                  nombre: "Aceite",
                  cantidadGramos: "10",
                  caloriasPor100: "10001",
                  proteinasPor100: "",
                  carbohidratosPor100: "",
                  grasasPor100: "",
                  fuente: "MANUAL",
                  referenciaExterna: "",
                },
              ],
            },
          ],
        },
      ],
    };
    expect(esquema.safeParse(conMacroExcesivo).success).toBe(false);
    expect(
      crearPlanSemanalDto.safeParse({
        nombre: "X",
        franjas: [
          {
            nombre: "Almuerzo",
            comidas: [
              {
                dia: "LUNES",
                items: [{ nombre: "Aceite", caloriasPor100: 10_001 }],
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rechaza porciones fuera del rango que admite el DTO", () => {
    for (const porciones of ["0", "101"]) {
      expect(
        esquema.safeParse({
          ...base,
          franjas: [
            {
              ...base.franjas[0]!,
              comidas: [{ ...base.franjas[0]!.comidas[0]!, porciones }],
            },
          ],
        }).success,
        `porciones ${porciones}`,
      ).toBe(false);
    }
    expect(
      crearPlanSemanalDto.safeParse({
        nombre: "X",
        franjas: [
          {
            nombre: "Almuerzo",
            comidas: [{ dia: "LUNES", descripcion: "algo", porciones: 101 }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("exige al menos una franja en los dos lados", () => {
    expect(esquema.safeParse({ ...base, franjas: [] }).success).toBe(false);
    expect(
      crearPlanSemanalDto.safeParse({ nombre: "X", franjas: [] }).success,
    ).toBe(false);
  });
});

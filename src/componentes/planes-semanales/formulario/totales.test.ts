import { describe, it, expect } from "vitest";
import { PlanSemanal } from "@/dominio/entidades/PlanSemanal";
import type { Macros } from "@/componentes/comunes/alimentos/macros";
import { totalesPorDia, macrosDeComida } from "./totales";
import { SIN_RECETA, type ComidaFormulario } from "./esquema";

/**
 * El espejo de la UI tiene que dar lo MISMO que el dominio.
 *
 * La grilla suma mientras se escribe (la presentación no puede llamar al
 * dominio) y el servidor vuelve a sumar al guardar. Si las dos cuentas se
 * separan, el profesional decide el menú mirando un número y el paciente
 * recibe otro, sin ningún error de por medio. Este test arma el mismo plan de
 * las dos formas y compara los siete días.
 */

const recetas: ReadonlyMap<string, Macros> = new Map([
  [
    "rec-1",
    {
      calorias: 300,
      proteinasG: 20,
      carbohidratosG: 30,
      grasasG: 10,
    },
  ],
]);

function comida(
  cambios: Partial<ComidaFormulario> & { dia: ComidaFormulario["dia"] },
): ComidaFormulario {
  return {
    descripcion: "",
    recetaId: SIN_RECETA,
    porciones: "",
    items: [],
    ...cambios,
  };
}

const franjasFormulario = [
  {
    nombre: "Desayuno",
    horaDesde: "08:00",
    horaHasta: "",
    comidas: [
      comida({
        dia: "LUNES",
        descripcion: "Tostadas",
        items: [
          {
            nombre: "Pan",
            cantidadGramos: "60",
            caloriasPor100: "250",
            proteinasPor100: "9",
            carbohidratosPor100: "45",
            grasasPor100: "3",
            fuente: "MANUAL",
            referenciaExterna: "",
          },
        ],
      }),
    ],
  },
  {
    nombre: "Almuerzo",
    horaDesde: "",
    horaHasta: "",
    comidas: [
      comida({
        dia: "LUNES",
        descripcion: "Receta del recetario",
        recetaId: "rec-1",
        porciones: "2",
      }),
      // Alternativa: NO suma al lunes.
      comida({
        dia: "LUNES",
        descripcion: "Alternativa carísima",
        items: [
          {
            nombre: "Pizza",
            cantidadGramos: "300",
            caloriasPor100: "300",
            proteinasPor100: "",
            carbohidratosPor100: "",
            grasasPor100: "",
            fuente: "MANUAL",
            referenciaExterna: "",
          },
        ],
      }),
      comida({
        dia: "MARTES",
        descripcion: "Milanesa",
        items: [
          {
            nombre: "Milanesa",
            cantidadGramos: "150",
            caloriasPor100: "220",
            proteinasPor100: "18",
            carbohidratosPor100: "12",
            grasasPor100: "10",
            fuente: "MANUAL",
            referenciaExterna: "",
          },
        ],
      }),
    ],
  },
];

/** El mismo plan, construido por el dominio (con los macros de la receta ya puestos). */
function planDeDominio(): PlanSemanal {
  let contador = 0;
  const plan = PlanSemanal.crear(
    {
      nombre: "Semana tipo",
      franjas: franjasFormulario.map((franja) => ({
        nombre: franja.nombre,
        horaDesde: franja.horaDesde || null,
        horaHasta: franja.horaHasta || null,
        comidas: franja.comidas.map((c) => ({
          dia: c.dia,
          descripcion: c.descripcion || null,
          recetaId: c.recetaId === SIN_RECETA ? null : c.recetaId,
          porciones: c.porciones === "" ? null : Number(c.porciones),
          items: c.items.map((item) => ({
            nombre: item.nombre,
            cantidadGramos: numero(item.cantidadGramos),
            caloriasPor100: numero(item.caloriasPor100),
            proteinasPor100: numero(item.proteinasPor100),
            carbohidratosPor100: numero(item.carbohidratosPor100),
            grasasPor100: numero(item.grasasPor100),
          })),
        })),
      })),
    },
    "sem-1",
    () => `id-${++contador}`,
  );

  // Los macros de la receta los completa el repositorio al leer: acá se
  // reponen a mano para que las dos cuentas partan del mismo dato.
  const props = plan.aPrimitivos();
  for (const franja of props.franjas) {
    for (const c of franja.comidas) {
      if (c.recetaId) c.recetaMacros = recetas.get(c.recetaId) ?? null;
    }
  }
  return PlanSemanal.reconstruir(props);
}

function numero(valor: string): number | null {
  return valor === "" ? null : Number(valor);
}

describe("totales de la grilla (espejo del dominio)", () => {
  it("da lo mismo que PlanSemanal.totalesPorDia en los siete días", () => {
    const deLaUI = totalesPorDia(franjasFormulario, recetas);
    for (const { dia, macros } of planDeDominio().totalesPorDia()) {
      expect(deLaUI[dia], `día ${dia}`).toEqual(macros);
    }
  });

  it("suma la principal de cada franja y no las alternativas", () => {
    const totales = totalesPorDia(franjasFormulario, recetas);
    // 150 (pan 60 g) + 600 (receta × 2 porciones). La alternativa de 900 no.
    expect(totales.LUNES.calorias).toBe(750);
  });

  it("una comida es sus alimentos MÁS la receta por sus porciones", () => {
    const macros = macrosDeComida(
      comida({
        dia: "LUNES",
        recetaId: "rec-1",
        porciones: "0,5",
        items: [
          {
            nombre: "Fruta",
            cantidadGramos: "100",
            caloriasPor100: "50",
            proteinasPor100: "",
            carbohidratosPor100: "",
            grasasPor100: "",
            fuente: "MANUAL",
            referenciaExterna: "",
          },
        ],
      }),
      recetas,
    );
    // La coma decimal se escribe así en Argentina: 50 + 300 × 0,5.
    expect(macros.calorias).toBe(200);
  });
});

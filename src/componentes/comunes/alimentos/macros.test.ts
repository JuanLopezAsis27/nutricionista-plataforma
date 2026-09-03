import { describe, it, expect } from "vitest";
import { aNumero, calcularTotales, porPorcion, hayMacros } from "./macros";
import type { AlimentoEnFormulario } from "./macros";

/**
 * Tests del cálculo de macros de una receta.
 *
 * POR QUÉ IMPORTAN: esto es un ESPEJO del cálculo que hace el dominio al
 * guardar. La pantalla lo necesita para mostrar los totales mientras se
 * escribe, sin ir al servidor por cada tecla. Que existan dos implementaciones
 * de la misma regla es deuda conocida —está anotada en el módulo—, pero
 * mientras exista, la de la UI es la que el profesional mira antes de decidir
 * si la receta le sirve. Si suma mal, se guarda un plan armado sobre un número
 * equivocado.
 *
 * Estos tests no podían escribirse antes: los cálculos vivían dentro de un
 * componente de 798 líneas.
 */

function ingrediente(
  cambios: Partial<AlimentoEnFormulario> = {},
): AlimentoEnFormulario {
  return {
    cantidadGramos: "100",
    caloriasPor100: "",
    proteinasPor100: "",
    carbohidratosPor100: "",
    grasasPor100: "",
    ...cambios,
  };
}

describe("aNumero", () => {
  it("acepta coma o punto como separador decimal", () => {
    // Los inputs son de texto libre y en Argentina se escribe con coma.
    expect(aNumero("12,5")).toBe(12.5);
    expect(aNumero("12.5")).toBe(12.5);
  });

  it("trata el vacío como ausencia, no como cero", () => {
    // Un campo vacío significa "no lo sé", y sumar 0 inventaría el dato.
    expect(aNumero("")).toBeNull();
    expect(aNumero("   ")).toBeNull();
    expect(aNumero(null)).toBeNull();
    expect(aNumero(undefined)).toBeNull();
  });

  it("rechaza texto y números negativos", () => {
    expect(aNumero("abc")).toBeNull();
    expect(aNumero("-5")).toBeNull();
  });
});

describe("calcularTotales", () => {
  it("escala los macros por la cantidad: están dados por 100 g", () => {
    // El error más caro de este cálculo sería olvidar el factor /100 y sumar
    // los valores por 100 g como si fueran los de la porción usada.
    const totales = calcularTotales([
      ingrediente({ cantidadGramos: "200", caloriasPor100: "100" }),
    ]);

    expect(totales.calorias).toBe(200);
  });

  it("suma varios ingredientes con cantidades distintas", () => {
    const totales = calcularTotales([
      ingrediente({
        cantidadGramos: "50",
        caloriasPor100: "100",
        proteinasPor100: "10",
      }),
      ingrediente({
        cantidadGramos: "150",
        caloriasPor100: "200",
        proteinasPor100: "4",
      }),
    ]);

    // 50g × 100/100 = 50 kcal + 150g × 200/100 = 300 kcal
    expect(totales.calorias).toBe(350);
    // 50g × 10/100 = 5 g + 150g × 4/100 = 6 g
    expect(totales.proteinasG).toBe(11);
  });

  it("ignora los ingredientes sin cantidad cargada", () => {
    // Una fila recién agregada está vacía: no puede arrastrar el total a 0.
    const totales = calcularTotales([
      ingrediente({ cantidadGramos: "100", caloriasPor100: "250" }),
      ingrediente({ cantidadGramos: "", caloriasPor100: "999" }),
    ]);

    expect(totales.calorias).toBe(250);
  });

  it("ignora la cantidad cero o negativa", () => {
    const totales = calcularTotales([
      ingrediente({ cantidadGramos: "0", caloriasPor100: "500" }),
    ]);

    expect(totales.calorias).toBeNull();
  });

  it("devuelve null en el macro que NINGÚN ingrediente aporta", () => {
    // Distinción central: null es "no se puede saber" y 0 es "hay cero". Si un
    // ingrediente no trae proteínas cargadas, el total de proteínas no es 0:
    // es desconocido, y mostrar 0 sería afirmar algo que nadie midió.
    const totales = calcularTotales([
      ingrediente({ cantidadGramos: "100", caloriasPor100: "250" }),
    ]);

    expect(totales.calorias).toBe(250);
    expect(totales.proteinasG).toBeNull();
    expect(totales.carbohidratosG).toBeNull();
    expect(totales.grasasG).toBeNull();
  });

  it("suma solo los que aportan, sin descartar el macro entero", () => {
    // Un ingrediente con proteínas y otro sin ellas: el total de proteínas es
    // el del primero, no null.
    const totales = calcularTotales([
      ingrediente({ cantidadGramos: "100", proteinasPor100: "20" }),
      ingrediente({ cantidadGramos: "100", caloriasPor100: "50" }),
    ]);

    expect(totales.proteinasG).toBe(20);
    expect(totales.calorias).toBe(50);
  });

  it("redondea las calorías a entero y los macros a un decimal", () => {
    const totales = calcularTotales([
      ingrediente({
        cantidadGramos: "33",
        caloriasPor100: "100",
        proteinasPor100: "10",
      }),
    ]);

    expect(totales.calorias).toBe(33);
    expect(totales.proteinasG).toBe(3.3);
  });

  it("devuelve todo null con la lista vacía", () => {
    expect(calcularTotales([])).toEqual({
      calorias: null,
      proteinasG: null,
      carbohidratosG: null,
      grasasG: null,
    });
  });
});

describe("porPorcion", () => {
  it("divide por la cantidad de porciones", () => {
    const porcion = porPorcion(
      { calorias: 800, proteinasG: 40, carbohidratosG: 90, grasasG: 20 },
      4,
    );

    expect(porcion).toEqual({
      calorias: 200,
      proteinasG: 10,
      carbohidratosG: 22.5,
      grasasG: 5,
    });
  });

  it("trata 'sin porciones' como una sola: no divide por cero", () => {
    // El campo de porciones es opcional. Sin este resguardo, la pantalla
    // mostraría Infinity apenas se cargue el primer ingrediente.
    const macros = {
      calorias: 800,
      proteinasG: 40,
      carbohidratosG: null,
      grasasG: null,
    };

    expect(porPorcion(macros, null).calorias).toBe(800);
    expect(porPorcion(macros, 0).calorias).toBe(800);
    expect(porPorcion(macros, -2).calorias).toBe(800);
  });

  it("conserva los null: no los convierte en 0", () => {
    const porcion = porPorcion(
      { calorias: 400, proteinasG: null, carbohidratosG: null, grasasG: null },
      2,
    );

    expect(porcion.calorias).toBe(200);
    expect(porcion.proteinasG).toBeNull();
  });
});

describe("hayMacros", () => {
  it("es falso solo si los cuatro macros son null", () => {
    expect(
      hayMacros({
        calorias: null,
        proteinasG: null,
        carbohidratosG: null,
        grasasG: null,
      }),
    ).toBe(false);

    expect(
      hayMacros({
        calorias: null,
        proteinasG: null,
        carbohidratosG: null,
        grasasG: 3,
      }),
    ).toBe(true);
  });

  it("un cero cuenta como dato: es un valor medido", () => {
    expect(
      hayMacros({
        calorias: 0,
        proteinasG: null,
        carbohidratosG: null,
        grasasG: null,
      }),
    ).toBe(true);
  });
});

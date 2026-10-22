import { describe, it, expect } from "vitest";
import {
  cambiarMedida,
  cantidadDesdeAlimento,
  cantidadParaGuardar,
  gramosEnFormulario,
  opcionesDeMedida,
} from "./cantidad";
import { calcularTotales } from "./macros";

/**
 * El espejo de la pantalla de las medidas (migración 90): los totales en vivo
 * tienen que decir lo mismo que el dominio al guardar, y cambiar de medida
 * convierte la cantidad en vez de perderla.
 */
describe("cantidad en el formulario", () => {
  const huevo = cantidadDesdeAlimento({
    unidadBase: "GRAMO",
    medidas: [{ nombre: "unidad", cantidad: 50 }],
  });

  it("un alimento con medidas entra en 1 de la primera", () => {
    expect(huevo.medida).toBe("unidad");
    expect(huevo.cantidadMedida).toBe("1");
    expect(gramosEnFormulario(huevo)).toBe(50);
  });

  it("sin medidas entra en 100 g/ml", () => {
    const leche = cantidadDesdeAlimento({
      unidadBase: "MILILITRO",
      medidas: [],
    });
    expect(leche.medida).toBe("");
    expect(gramosEnFormulario(leche)).toBe(100);
    // Un líquido ofrece las medidas de volumen estándar.
    expect(opcionesDeMedida(leche).map((o) => o.medida?.nombre)).toContain(
      "cucharada",
    );
  });

  it("cambiar de medida convierte la cantidad", () => {
    const enGramos = cambiarMedida(
      { ...huevo, cantidadMedida: "3" },
      opcionesDeMedida(huevo)[0]!,
    );
    expect(enGramos.medida).toBe("");
    expect(enGramos.cantidadGramos).toBe("150");
    const deVuelta = cambiarMedida(
      enGramos,
      opcionesDeMedida(enGramos).find((o) => o.medida?.nombre === "unidad")!,
    );
    expect(deVuelta.cantidadMedida).toBe("3");
  });

  it("los totales en vivo usan los g/ml de la medida", () => {
    const totales = calcularTotales([
      {
        ...huevo,
        cantidadMedida: "2",
        caloriasPor100: "143",
        proteinasPor100: "",
        carbohidratosPor100: "",
        grasasPor100: "",
      },
    ]);
    expect(totales.calorias).toBe(143);
  });

  it("al guardar viaja la medida con su equivalencia", () => {
    expect(cantidadParaGuardar({ ...huevo, cantidadMedida: "2" })).toEqual({
      cantidadGramos: 100,
      unidadBase: "GRAMO",
      medidas: [{ nombre: "unidad", cantidad: 50 }],
      medida: "unidad",
      cantidadMedida: 2,
      cantidadPorMedida: 50,
    });
  });
});

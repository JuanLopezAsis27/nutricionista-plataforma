import { describe, it, expect } from "vitest";
import {
  calcularGrasaPorPliegues,
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "./grasaPorPliegues";
import type { MedidasComposicion } from "./composicionCorporal";

/** Solo los pliegues; el resto no interviene en el modelo de 2 componentes. */
function medidas(
  cambios: Partial<MedidasComposicion> = {},
): MedidasComposicion {
  return {
    pesoKg: 80,
    tallaCm: 175,
    tallaSentadoCm: null,
    diamBiacromial: null,
    diamToraxTransverso: null,
    diamToraxAnteroposterior: null,
    diamBiiliocrestideo: null,
    diamHumeral: null,
    diamFemoral: null,
    circCabeza: null,
    circBrazo: null,
    circBrazoContraido: null,
    circAntebrazo: null,
    circTorax: null,
    circCinturaMinima: null,
    circCadera: null,
    circMusloMaximo: null,
    circMusloMedial: null,
    circPantorrilla: null,
    // Los 6 pliegues de la planilla, que es lo que se carga siempre.
    pliegueTricipital: 10,
    pliegueSubescapular: 12,
    pliegueSupraespinal: 8,
    pliegueAbdominal: 15,
    pliegueMuslo: 14,
    plieguePantorrilla: 9,
    pliegueBicipital: null,
    pliegueCrestaIliaca: null,
    plieguePectoral: null,
    pliegueAxilarMedio: null,
    pliegueLumbar: null,
    ...cambios,
  };
}

function porMetodo(
  resultado: ReturnType<typeof calcularGrasaPorPliegues>,
): Map<MetodoGrasa, (typeof resultado.resultados)[number]> {
  return new Map(resultado.resultados.map((r) => [r.metodo, r]));
}

describe("calcularGrasaPorPliegues — con los 6 pliegues de la planilla", () => {
  const varon = calcularGrasaPorPliegues(medidas(), {
    sexo: "MASCULINO",
    edadAnios: 30,
  });
  const mujer = calcularGrasaPorPliegues(medidas(), {
    sexo: "FEMENINO",
    edadAnios: 30,
  });

  it("resuelve los cuatro métodos que solo necesitan esos 6 pliegues", () => {
    // Σ4 = 45; Σ6 = 68. Withers femenino usa su propia Σ4 = 39.
    expect([...porMetodo(varon).keys()]).toEqual([
      "YUHASZ_CARTER",
      "YUHASZ_CARTER_KERR",
      "FAULKNER",
      "FAULKNER_KERR",
    ]);
  });

  describe("Faulkner (1968)", () => {
    it("varón: 0,153 × 45 + 5,783", () => {
      const r = porMetodo(varon).get("FAULKNER")!;
      expect(r.sumatoriaPliegues).toBe(45);
      expect(r.porcentajeGrasa).toBeCloseTo(12.67, 2);
    });

    it("mujer: 0,213 × 45 + 7,9", () => {
      expect(porMetodo(mujer).get("FAULKNER")!.porcentajeGrasa).toBeCloseTo(
        17.49,
        2,
      );
    });

    it("el ajuste de Kerr multiplica por 1,14", () => {
      const base = porMetodo(varon).get("FAULKNER")!.porcentajeGrasa;
      const kerr = porMetodo(varon).get("FAULKNER_KERR")!.porcentajeGrasa;
      expect(kerr).toBeCloseTo(base * 1.14, 1);
    });
  });

  describe("Yuhasz / Carter", () => {
    it("varón: 0,1051 × 68 + 2,585", () => {
      const r = porMetodo(varon).get("YUHASZ_CARTER")!;
      expect(r.sumatoriaPliegues).toBe(68);
      expect(r.porcentajeGrasa).toBeCloseTo(9.73, 2);
    });

    it("mujer: 0,1548 × 68 + 3,58", () => {
      expect(
        porMetodo(mujer).get("YUHASZ_CARTER")!.porcentajeGrasa,
      ).toBeCloseTo(14.11, 2);
    });

    it("el ajuste de Kerr multiplica por 1,17", () => {
      const base = porMetodo(varon).get("YUHASZ_CARTER")!.porcentajeGrasa;
      const kerr = porMetodo(varon).get("YUHASZ_CARTER_KERR")!.porcentajeGrasa;
      expect(kerr).toBeCloseTo(base * 1.17, 1);
    });
  });

  it("deriva masa grasa y masa libre de grasa contra el peso", () => {
    const r = porMetodo(varon).get("YUHASZ_CARTER")!;
    expect(r.masaGrasaKg).toBeCloseTo((r.porcentajeGrasa * 80) / 100, 1);
    expect(r.masaGrasaKg + r.masaLibreGrasaKg).toBeCloseTo(80, 1);
  });

  it("pide el bicipital para Withers en varones, pero no en mujeres", () => {
    const faltaVaron = varon.faltantes.find((f) => f.metodo === "WITHERS")!;
    expect(faltaVaron.campos).toEqual(["Pliegue bicipital"]);
    // En mujeres Withers usa tríceps, subescapular, supraespinal y pantorrilla.
    expect(mujer.faltantes.some((f) => f.metodo === "WITHERS")).toBe(false);
  });

  it("Withers femenino es logarítmico sobre su propia Σ4", () => {
    const r = porMetodo(mujer).get("WITHERS")!;
    // Σ4 = 10 + 12 + 8 + 9 = 39.
    expect(r.sumatoriaPliegues).toBe(39);
    const densidadEsperada = 1.20953 - 0.08294 * Math.log10(39);
    expect(r.densidadCorporal).toBeCloseTo(densidadEsperada, 4);
    expect(r.porcentajeGrasa).toBeCloseTo(495 / densidadEsperada - 450, 2);
  });

  it("pide bicipital y cresta ilíaca para Durnin & Womersley", () => {
    const falta = varon.faltantes.find((f) => f.metodo === "DURNIN_WOMERSLEY")!;
    expect(falta.campos).toEqual([
      "Pliegue bicipital",
      "Pliegue de cresta ilíaca",
    ]);
  });
});

describe("Withers en varones (Σ7 lineal)", () => {
  it("aplica 1,0988 − 0,0004 × Σ7 y convierte con Siri", () => {
    const resultado = calcularGrasaPorPliegues(
      medidas({ pliegueBicipital: 5 }),
      { sexo: "MASCULINO", edadAnios: 25 },
    );
    const r = porMetodo(resultado).get("WITHERS")!;

    expect(r.sumatoriaPliegues).toBe(73);
    const densidadEsperada = 1.0988 - 0.0004 * 73;
    expect(r.densidadCorporal).toBeCloseTo(densidadEsperada, 5);
    expect(r.porcentajeGrasa).toBeCloseTo(495 / densidadEsperada - 450, 2);
  });
});

describe("Durnin & Womersley", () => {
  const completas = medidas({ pliegueBicipital: 5, pliegueCrestaIliaca: 11 });

  it("usa cresta ilíaca, NO supraespinal, en su Σ4", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(completas, { sexo: "MASCULINO", edadAnios: 25 }),
    ).get("DURNIN_WOMERSLEY")!;
    // 5 (bíceps) + 10 (tríceps) + 12 (subescapular) + 11 (cresta) = 38.
    expect(r.sumatoriaPliegues).toBe(38);
  });

  it("cambia de coeficientes según la franja etaria", () => {
    const joven = porMetodo(
      calcularGrasaPorPliegues(completas, { sexo: "MASCULINO", edadAnios: 25 }),
    ).get("DURNIN_WOMERSLEY")!;
    const mayor = porMetodo(
      calcularGrasaPorPliegues(completas, { sexo: "MASCULINO", edadAnios: 55 }),
    ).get("DURNIN_WOMERSLEY")!;

    // 20-29: DC = 1,1631 − 0,0632·log10(38); ≥50: 1,1715 − 0,0779·log10(38).
    expect(joven.densidadCorporal).toBeCloseTo(
      1.1631 - 0.0632 * Math.log10(38),
      5,
    );
    expect(mayor.densidadCorporal).toBeCloseTo(
      1.1715 - 0.0779 * Math.log10(38),
      5,
    );
    // A igual pliegue, el mayor tiene menos densidad y por lo tanto más grasa.
    expect(mayor.porcentajeGrasa).toBeGreaterThan(joven.porcentajeGrasa);
  });

  it("sin edad no se puede elegir la franja: queda como faltante", () => {
    const resultado = calcularGrasaPorPliegues(completas, {
      sexo: "MASCULINO",
      edadAnios: null,
    });
    const falta = resultado.faltantes.find(
      (f) => f.metodo === "DURNIN_WOMERSLEY",
    )!;
    expect(falta.campos).toContain("Fecha de nacimiento del paciente");
  });
});

describe("degradación", () => {
  it("sin sexo no se calcula ningún método", () => {
    const resultado = calcularGrasaPorPliegues(medidas(), {
      sexo: null,
      edadAnios: 30,
    });

    expect(resultado.resultados).toEqual([]);
    expect(resultado.faltantes).toHaveLength(METODOS_GRASA.length);
    for (const falta of resultado.faltantes) {
      expect(falta.campos).toContain("Sexo biológico del paciente");
    }
  });

  it("con solo 4 pliegues resuelve Faulkner y no Yuhasz", () => {
    const resultado = calcularGrasaPorPliegues(
      medidas({ pliegueMuslo: null, plieguePantorrilla: null }),
      { sexo: "MASCULINO", edadAnios: 30 },
    );
    const metodos = porMetodo(resultado);

    expect(metodos.has("FAULKNER")).toBe(true);
    expect(metodos.has("YUHASZ_CARTER")).toBe(false);
    expect(
      resultado.faltantes.find((f) => f.metodo === "YUHASZ_CARTER")!.campos,
    ).toEqual(["Pliegue de muslo", "Pliegue de pantorrilla"]);
  });

  it("trata el 0 como pliegue no medido", () => {
    const resultado = calcularGrasaPorPliegues(medidas({ pliegueMuslo: 0 }), {
      sexo: "MASCULINO",
      edadAnios: 30,
    });
    expect(porMetodo(resultado).has("YUHASZ_CARTER")).toBe(false);
  });
});

describe("Jackson & Pollock", () => {
  /** Los 7 sitios completos: a los 6 de la planilla, pectoral y axilar medio. */
  const siete = medidas({
    plieguePectoral: 7,
    pliegueAxilarMedio: 6,
    pliegueCrestaIliaca: 11,
  });

  it("la de 7 sitios suma pectoral y axilar medio, y deja fuera la pantorrilla", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(siete, { sexo: "MASCULINO", edadAnios: 30 }),
    ).get("JACKSON_POLLOCK_7")!;
    // 7 (pectoral) + 6 (axilar) + 10 (tríceps) + 12 (subescapular)
    // + 15 (abdominal) + 11 (cresta ilíaca) + 14 (muslo) = 75.
    expect(r.sumatoriaPliegues).toBe(75);
  });

  it("la de 7 sitios pasa por densidad cuadrática y convierte con Siri", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(siete, { sexo: "MASCULINO", edadAnios: 30 }),
    ).get("JACKSON_POLLOCK_7")!;
    const esperada =
      1.112 - 0.00043499 * 75 + 0.00000055 * 75 ** 2 - 0.00028826 * 30;
    expect(r.densidadCorporal).toBeCloseTo(esperada, 5);
    expect(r.porcentajeGrasa).toBeCloseTo(495 / esperada - 450, 2);
  });

  it("la de 4 sitios devuelve el porcentaje DIRECTO, sin densidad", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(siete, { sexo: "FEMENINO", edadAnios: 40 }),
    ).get("JACKSON_POLLOCK_4")!;
    // 10 (tríceps) + 15 (abdominal) + 11 (cresta ilíaca) + 14 (muslo) = 50.
    expect(r.sumatoriaPliegues).toBe(50);
    expect(r.densidadCorporal).toBeNull();
    const esperado = 0.29669 * 50 - 0.00043 * 50 ** 2 + 0.02963 * 40 + 1.4072;
    expect(r.porcentajeGrasa).toBeCloseTo(esperado, 2);
  });

  it("las dos necesitan la edad", () => {
    const resultado = calcularGrasaPorPliegues(siete, {
      sexo: "MASCULINO",
      edadAnios: null,
    });
    const sinEdad = resultado.faltantes.filter((f) =>
      f.campos.includes("Fecha de nacimiento del paciente"),
    );
    expect(sinEdad.map((f) => f.metodo)).toEqual(
      expect.arrayContaining(["JACKSON_POLLOCK_7", "JACKSON_POLLOCK_4"]),
    );
  });

  it("sin pectoral, la de 7 queda como faltante y la de 4 se calcula igual", () => {
    const porMet = porMetodo(
      calcularGrasaPorPliegues(medidas({ pliegueCrestaIliaca: 11 }), {
        sexo: "MASCULINO",
        edadAnios: 30,
      }),
    );
    expect(porMet.get("JACKSON_POLLOCK_7")).toBeUndefined();
    expect(porMet.get("JACKSON_POLLOCK_4")).toBeDefined();
  });
});

describe("Parrillo", () => {
  const nueve = medidas({
    plieguePectoral: 7,
    pliegueLumbar: 8,
    pliegueBicipital: 5,
    pliegueCrestaIliaca: 11,
  });

  it("suma los 9 sitios y divide por el peso en libras", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(nueve, { sexo: "MASCULINO", edadAnios: 30 }),
    ).get("PARRILLO")!;
    // 7 + 5 + 10 + 12 + 15 + 11 + 14 + 8 + 9 = 91 mm.
    expect(r.sumatoriaPliegues).toBe(91);
    const libras = 80 / 0.45359237;
    expect(r.porcentajeGrasa).toBeCloseTo((27 * 91) / libras, 2);
  });

  it("es la única que depende del peso: a igual Σ, más peso es menos %", () => {
    const liviano = porMetodo(
      calcularGrasaPorPliegues(nueve, { sexo: "MASCULINO", edadAnios: 30 }),
    ).get("PARRILLO")!;
    const pesado = porMetodo(
      calcularGrasaPorPliegues(
        { ...nueve, pesoKg: 100 },
        { sexo: "MASCULINO", edadAnios: 30 },
      ),
    ).get("PARRILLO")!;

    expect(pesado.sumatoriaPliegues).toBe(liviano.sumatoriaPliegues);
    expect(pesado.porcentajeGrasa).toBeLessThan(liviano.porcentajeGrasa);
  });

  it("no necesita edad", () => {
    const r = porMetodo(
      calcularGrasaPorPliegues(nueve, { sexo: "MASCULINO", edadAnios: null }),
    ).get("PARRILLO")!;
    expect(r.porcentajeGrasa).toBeGreaterThan(0);
  });
});

describe("catálogo de métodos", () => {
  it("cada método declara su población de validación", () => {
    for (const metodo of METODOS_GRASA) {
      const definicion = DEFINICIONES_METODO[metodo];
      expect(definicion.etiqueta.length).toBeGreaterThan(0);
      expect(definicion.poblacion.length).toBeGreaterThan(0);
      expect(definicion.autor.length).toBeGreaterThan(0);
    }
  });

  it("declara cuáles pasan por densidad corporal antes de convertir con Siri", () => {
    const porDensidad = METODOS_GRASA.filter(
      (m) => DEFINICIONES_METODO[m].porDensidad,
    );
    expect(porDensidad).toEqual([
      "WITHERS",
      "DURNIN_WOMERSLEY",
      "JACKSON_POLLOCK_7",
    ]);
  });

  it("Jackson & Pollock de 4 pliegues NO pasa por densidad", () => {
    // Es el error clásico al transcribirla: la de 7 sitios devuelve densidad
    // y la de 4, el porcentaje directo. Aplicarle Siri encima da disparates.
    expect(DEFINICIONES_METODO.JACKSON_POLLOCK_4.porDensidad).toBe(false);
  });
});

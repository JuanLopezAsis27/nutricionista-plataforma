import { describe, it, expect } from "vitest";
import { TALLA_PHANTOM, type MedidasComposicion } from "../composicionCorporal";
import {
  calcularDistribucion,
  type DistribucionCorporal,
} from "./distribucion";

/** Medición vacía salvo el peso; cada test enciende los sitios que necesita. */
function medidas(
  cambios: Partial<MedidasComposicion> = {},
): MedidasComposicion {
  return {
    pesoKg: 70,
    tallaCm: 170,
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
    pliegueTricipital: null,
    pliegueSubescapular: null,
    pliegueSupraespinal: null,
    pliegueAbdominal: null,
    pliegueMuslo: null,
    plieguePantorrilla: null,
    pliegueBicipital: null,
    pliegueCrestaIliaca: null,
    plieguePectoral: null,
    pliegueAxilarMedio: null,
    pliegueLumbar: null,
    ...cambios,
  };
}

/**
 * Calcula con la talla del Phantom por defecto: así el factor de escalado es 1
 * y los Score-Z esperados se leen sin arrastrar una corrección de talla.
 */
function calcular(
  cambios: Partial<MedidasComposicion> = {},
  tallaCm: number | null = TALLA_PHANTOM,
): DistribucionCorporal {
  return calcularDistribucion(
    medidas({ ...cambios, tallaCm }),
    tallaCm == null ? null : TALLA_PHANTOM / tallaCm,
  );
}

/** Los 6 pliegues de la planilla, con los valores medios del Phantom. */
const SEIS_COMO_EL_PHANTOM = {
  pliegueTricipital: 15.4,
  pliegueSubescapular: 17.2,
  pliegueSupraespinal: 15.4,
  pliegueAbdominal: 25.4,
  pliegueMuslo: 27,
  plieguePantorrilla: 16,
};

/** Los tres segmentos con los perímetros y pliegues medios del Phantom. */
const SEGMENTOS_COMO_EL_PHANTOM = {
  circBrazo: 26.89,
  pliegueTricipital: 15.4,
  circMusloMaximo: 55.82,
  pliegueMuslo: 27,
  circPantorrilla: 35.25,
  plieguePantorrilla: 16,
};

describe("distribución adiposa", () => {
  it("sin pliegues, o con una sola zona medida, no hay reparto", () => {
    expect(calcular().adiposa).toBeNull();
    // 100 % en una zona no es una distribución: es el único pliegue tomado.
    expect(calcular({ pliegueAbdominal: 20 }).adiposa).toBeNull();
    expect(
      calcular({ pliegueAbdominal: 20, pliegueSupraespinal: 15 }).adiposa,
    ).toBeNull();
  });

  it("las tres zonas suman 100 sobre la Σ de pliegues", () => {
    const d = calcular(SEIS_COMO_EL_PHANTOM).adiposa!;

    expect(d.totalMm).toBe(116.4);
    expect(d.zonas.map((z) => z.zona)).toEqual([
      "SUPERIOR",
      "CENTRAL",
      "INFERIOR",
    ]);
    expect(d.zonas.map((z) => z.porcentaje)).toEqual([28.01, 35.05, 36.94]);
    expect(d.zonas.reduce((total, z) => total + z.porcentaje, 0)).toBeCloseTo(
      100,
      1,
    );
    expect(d.zonas.map((z) => z.sumaMm)).toEqual([32.6, 40.8, 43]);
  });

  it("el subescapular cuenta como SUPERIOR, no como central", () => {
    // La zona central es la CINTURA —lo que se lee por riesgo
    // cardiometabólico—; el tronco alto se mueve con el tren superior. Meter
    // el subescapular en central movería las dos zonas a la vez.
    const d = calcular(SEIS_COMO_EL_PHANTOM).adiposa!;
    const superior = d.zonas.find((z) => z.zona === "SUPERIOR")!;
    expect(superior.sitios.map((s) => s.campo)).toEqual([
      "pliegueTricipital",
      "pliegueSubescapular",
    ]);
  });

  it("los sitios de fuera del ISAK entran en su zona anatómica", () => {
    // La zona es anatómica: no depende de qué ecuación nombre el sitio.
    const d = calcular({
      ...SEIS_COMO_EL_PHANTOM,
      plieguePectoral: 10,
      pliegueLumbar: 12,
      pliegueBicipital: 6,
      pliegueCrestaIliaca: 20,
    }).adiposa!;

    const campos = (zona: string): (keyof MedidasComposicion)[] =>
      d.zonas.find((z) => z.zona === zona)!.sitios.map((s) => s.campo);

    expect(campos("SUPERIOR")).toContain("plieguePectoral");
    expect(campos("SUPERIOR")).toContain("pliegueBicipital");
    expect(campos("CENTRAL")).toContain("pliegueLumbar");
    expect(campos("CENTRAL")).toContain("pliegueCrestaIliaca");
  });
});

describe("distribución muscular", () => {
  it("descuenta el pliegue del perímetro del mismo segmento", () => {
    const d = calcular({
      circBrazo: 30,
      pliegueTricipital: 10,
      circPantorrilla: 36,
      plieguePantorrilla: 10,
    }).muscular!;

    const brazo = d.segmentos.find((s) => s.segmento === "BRAZO")!;
    expect(brazo.perimetroCm).toBe(30);
    // 30 − 3,141 · 10 / 10 = 26,859 → 26,86.
    expect(brazo.corregidoCm).toBe(26.86);
  });

  it("un segmento sin su pliegue no entra a medias", () => {
    const d = calcular({
      circBrazo: 30,
      pliegueTricipital: 10,
      // Sin `pliegueMuslo`: el perímetro crudo llevaría la grasa adentro y
      // abultaría la parte del muslo en el reparto.
      circMusloMaximo: 55,
      circPantorrilla: 36,
      plieguePantorrilla: 10,
    }).muscular!;

    expect(d.segmentos.map((s) => s.segmento)).toEqual(["BRAZO", "PIERNA"]);
  });

  it("los tres segmentos reparten el 100 % del corregido", () => {
    const d = calcular(SEGMENTOS_COMO_EL_PHANTOM).muscular!;
    expect(
      d.segmentos.reduce((total, s) => total + s.porcentaje, 0),
    ).toBeCloseTo(100, 1);
    expect(d.totalCm).toBeCloseTo(
      d.segmentos.reduce((total, s) => total + s.corregidoCm, 0),
      1,
    );
  });

  it("un sujeto con las medidas del Phantom da Score-Z 0", () => {
    // Es la comprobación de que la media corregida de la referencia se deriva
    // con la MISMA corrección que el paciente: si una punta de la resta usara
    // otra constante, esto no daría cero.
    const d = calcular(SEGMENTOS_COMO_EL_PHANTOM).muscular!;
    for (const segmento of d.segmentos) {
      expect(segmento.scoreZ).toBeCloseTo(0, 2);
    }
  });

  it("un brazo más grueso que la referencia da Score-Z positivo", () => {
    const d = calcular({
      ...SEGMENTOS_COMO_EL_PHANTOM,
      circBrazo: 32,
    }).muscular!;
    const brazo = d.segmentos.find((s) => s.segmento === "BRAZO")!;
    // (32 − 4,83714 − 22,05286) / 1,91 = 2,68.
    expect(brazo.scoreZ).toBe(2.68);
  });

  it("sin talla no hay Score-Z, pero sí reparto", () => {
    // Sin talla no se puede escalar a la referencia, y un Z sin escalar
    // mediría el tamaño de la persona en vez de su proporción.
    const d = calcular(SEGMENTOS_COMO_EL_PHANTOM, null).muscular!;
    expect(d.segmentos.every((s) => s.scoreZ === null)).toBe(true);
    expect(d.segmentos).toHaveLength(3);
  });
});

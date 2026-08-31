import { describe, it, expect } from "vitest";
import type { MedidasComposicion } from "../composicionCorporal";
import { calcularDistribucion } from "./distribucion";

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

/** Los 6 pliegues de la planilla, repartidos como el Phantom. */
const SEIS_COMO_EL_PHANTOM = {
  pliegueTricipital: 15.4,
  pliegueSubescapular: 17.2,
  pliegueSupraespinal: 15.4,
  pliegueAbdominal: 25.4,
  pliegueMuslo: 27,
  plieguePantorrilla: 16,
};

describe("distribución adiposa", () => {
  it("sin al menos dos sitios no hay reparto que mostrar", () => {
    expect(calcularDistribucion(medidas()).adiposa).toBeNull();
    expect(
      calcularDistribucion(medidas({ pliegueAbdominal: 20 })).adiposa,
    ).toBeNull();
  });

  it("los aportes suman 100 y cada sitio lleva su región", () => {
    const d = calcularDistribucion(medidas(SEIS_COMO_EL_PHANTOM)).adiposa!;

    expect(d.total).toBe(116.4);
    const suma = d.partes.reduce((t, p) => t + p.porcentaje, 0);
    expect(suma).toBeCloseTo(100, 0);

    const tronco = d.partes.filter((p) => p.region === "TRONCO");
    expect(tronco.map((p) => p.campo).sort()).toEqual([
      "pliegueAbdominal",
      "pliegueSubescapular",
      "pliegueSupraespinal",
    ]);
  });

  it("un reparto igual al del Phantom se lee como equilibrado", () => {
    const d = calcularDistribucion(medidas(SEIS_COMO_EL_PHANTOM)).adiposa!;
    expect(d.relativa).toBeCloseTo(1, 3);
    expect(d.patron).toBe("EQUILIBRADO");
  });

  it("el mismo total con más pliegue de tronco da patrón central", () => {
    const d = calcularDistribucion(
      medidas({
        ...SEIS_COMO_EL_PHANTOM,
        pliegueAbdominal: 45,
        pliegueSubescapular: 30,
      }),
    ).adiposa!;
    expect(d.razon).toBeGreaterThan(d.razonReferencia!);
    expect(d.patron).toBe("CENTRAL");
  });

  it("con la grasa en las extremidades da patrón periférico", () => {
    const d = calcularDistribucion(
      medidas({
        ...SEIS_COMO_EL_PHANTOM,
        pliegueMuslo: 50,
        plieguePantorrilla: 35,
      }),
    ).adiposa!;
    expect(d.patron).toBe("PERIFERICO");
  });

  it("los sitios sin referencia Phantom entran al reparto pero no a la razón", () => {
    const base = calcularDistribucion(medidas(SEIS_COMO_EL_PHANTOM)).adiposa!;
    const conCresta = calcularDistribucion(
      // La cresta ilíaca es de tronco y no tiene media Phantom: si entrara en
      // la razón, este caso pasaría a leerse como CENTRAL sin que la persona
      // haya cambiado, solo por haber medido un sitio más.
      medidas({ ...SEIS_COMO_EL_PHANTOM, pliegueCrestaIliaca: 20 }),
    ).adiposa!;

    expect(conCresta.partes.map((p) => p.campo)).toContain(
      "pliegueCrestaIliaca",
    );
    expect(conCresta.razon).toBe(base.razon);
    expect(conCresta.patron).toBe("EQUILIBRADO");
  });
});

describe("distribución muscular", () => {
  it("descuenta el pliegue del perímetro del mismo segmento", () => {
    const d = calcularDistribucion(
      medidas({
        circBrazo: 30,
        pliegueTricipital: 10,
        circPantorrilla: 36,
        plieguePantorrilla: 10,
      }),
    ).muscular!;

    const brazo = d.partes.find((p) => p.campo === "circBrazo")!;
    // 30 − 3,141 · 10 / 10 = 26,859 → 26,9.
    expect(brazo.valor).toBe(26.9);
  });

  it("un segmento sin su pliegue no entra a medias", () => {
    const d = calcularDistribucion(
      medidas({
        circBrazo: 30,
        pliegueTricipital: 10,
        // Sin `pliegueMuslo`: el perímetro crudo llevaría la grasa adentro.
        circMusloMaximo: 55,
        circPantorrilla: 36,
        plieguePantorrilla: 10,
      }),
    ).muscular!;

    expect(d.partes.map((p) => p.campo)).not.toContain("circMusloMaximo");
  });

  it("el antebrazo entra sin corregir: el protocolo no tiene su pliegue", () => {
    const d = calcularDistribucion(
      medidas({
        circAntebrazo: 26,
        circPantorrilla: 36,
        plieguePantorrilla: 10,
      }),
    ).muscular!;

    const antebrazo = d.partes.find((p) => p.campo === "circAntebrazo")!;
    expect(antebrazo.valor).toBe(26);
    expect(antebrazo.region).toBe("SUPERIOR");
  });

  it("un tren superior desproporcionado se lee como SUPERIOR", () => {
    const d = calcularDistribucion(
      medidas({
        circBrazo: 40,
        pliegueTricipital: 10,
        circAntebrazo: 33,
        circMusloMaximo: 50,
        pliegueMuslo: 27,
        circPantorrilla: 33,
        plieguePantorrilla: 16,
      }),
    ).muscular!;

    expect(d.patron).toBe("SUPERIOR");
    expect(d.relativa).toBeGreaterThan(1);
  });
});

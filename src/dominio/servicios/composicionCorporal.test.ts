import { describe, it, expect } from "vitest";
import {
  calcularComposicion,
  type ContextoComposicion,
  type MedidasComposicion,
} from "./composicionCorporal";

/**
 * Caso de referencia: la planilla "AntropogimS2" del profesional, medición
 * del 18/01/2021 (varón de 26,64 años, 88,4 kg, 193 cm). Cada expect compara
 * contra el número que produce el Excel, celda por celda: si alguien toca una
 * constante del modelo, este test lo caza.
 */
const MEDIDAS_PLANILLA: MedidasComposicion = {
  pesoKg: 88.4,
  tallaCm: 193,
  tallaSentadoCm: 97,
  diamBiacromial: 45.4,
  diamToraxTransverso: 32,
  diamToraxAnteroposterior: 20,
  diamBiiliocrestideo: 31.5,
  diamHumeral: 7.8,
  diamFemoral: 10.6,
  circCabeza: 56.5,
  circBrazo: 30,
  circBrazoContraido: 32,
  circAntebrazo: 29,
  circTorax: 100,
  circCinturaMinima: 84,
  circCadera: 102,
  circMusloMaximo: 62,
  circMusloMedial: 58,
  circPantorrilla: 40.5,
  pliegueTricipital: 5,
  pliegueSubescapular: 8,
  pliegueSupraespinal: 5,
  pliegueAbdominal: 8,
  pliegueMuslo: 5,
  plieguePantorrilla: 4,
  // La planilla del profesional no los toma; el modelo de 2 componentes sí.
  pliegueBicipital: null,
  pliegueCrestaIliaca: null,
};

const CONTEXTO_PLANILLA: ContextoComposicion = {
  sexo: "MASCULINO",
  edadAnios: 26.64,
  nivelActividad: "INTENSA",
};

describe("calcularComposicion — caso de la planilla del profesional", () => {
  const resultado = calcularComposicion(MEDIDAS_PLANILLA, CONTEXTO_PLANILLA);

  it("no reporta bloques faltantes con la planilla completa", () => {
    expect(resultado.faltantes).toEqual([]);
  });

  describe("fraccionamiento en 5 componentes (Kerr, 1988)", () => {
    const f = resultado.fraccionamiento!;

    it("calcula los Score-Z de cada masa", () => {
      expect(f.adiposa.scoreZ).toBeCloseTo(-2.459, 3);
      expect(f.muscular.scoreZ).toBeCloseTo(1.257, 3);
      expect(f.residual.scoreZ).toBeCloseTo(2.0331, 3);
      expect(f.osea.scoreZ).toBeCloseTo(0.2582, 3);
      expect(f.piel.scoreZ).toBeNull();
    });

    it("llega al peso estructurado y su diferencia con la balanza", () => {
      expect(f.pesoEstructuradoKg).toBeCloseTo(88.8894, 3);
      expect(f.diferenciaKg).toBeCloseTo(0.4894, 3);
      expect(f.diferenciaPorcentaje).toBeCloseTo(0.0055, 4);
    });

    it("reparte el error para que las 5 masas sumen el peso bruto", () => {
      expect(f.adiposa.kg).toBeCloseTo(16.268, 2);
      expect(f.muscular.kg).toBeCloseTo(45.39, 2);
      expect(f.residual.kg).toBeCloseTo(10.762, 2);
      expect(f.osea.kg).toBeCloseTo(11.477, 2);
      expect(f.piel.kg).toBeCloseTo(4.503, 2);

      const suma =
        f.adiposa.kg + f.muscular.kg + f.residual.kg + f.osea.kg + f.piel.kg;
      expect(suma).toBeCloseTo(MEDIDAS_PLANILLA.pesoKg, 2);
    });

    it("desglosa la masa ósea en cráneo y resto del esqueleto", () => {
      expect(f.masaOseaCabezaKg).toBeCloseTo(1.256, 2);
      expect(f.masaOseaCuerpoKg).toBeCloseTo(10.221, 2);
    });

    it("expresa cada masa en porcentaje y en índice kg/m²", () => {
      expect(f.adiposa.porcentaje).toBeCloseTo(18.4, 1);
      expect(f.muscular.porcentaje).toBeCloseTo(51.35, 1);
      expect(f.residual.porcentaje).toBeCloseTo(12.17, 1);
      expect(f.osea.porcentaje).toBeCloseTo(12.98, 1);
      expect(f.piel.porcentaje).toBeCloseTo(5.09, 1);

      expect(f.adiposa.indice).toBeCloseTo(4.3674, 2);
      expect(f.muscular.indice).toBeCloseTo(12.1854, 2);
      expect(f.osea.indice).toBeCloseTo(3.0812, 2);
    });
  });

  describe("somatotipo de Heath & Carter (1990)", () => {
    const s = resultado.somatotipo!;

    it("reproduce el rating 1,4 — 4,7 — 3,1 de la planilla", () => {
      expect(s.endomorfia).toBeCloseTo(1.4, 1);
      expect(s.mesomorfia).toBeCloseTo(4.7, 1);
      expect(s.ectomorfia).toBeCloseTo(3.1, 1);
    });

    it("calcula la sumatoria corregida y el HWR", () => {
      expect(s.sumatoriaPliegues).toBeCloseTo(15.8717, 3);
      expect(s.hwr).toBeCloseTo(43.3316, 3);
    });

    it("ubica el punto en la somatocarta", () => {
      expect(s.x).toBeCloseTo(1.72, 1);
      expect(s.y).toBeCloseTo(4.76, 1);
    });
  });

  describe("perfil Phantom", () => {
    const porVariable = new Map(resultado.phantom.map((p) => [p.variable, p]));

    it("escala el peso por el cubo del factor de talla", () => {
      expect(porVariable.get("pesoKg")!.valorAjustado).toBeCloseTo(60.6, 1);
      expect(porVariable.get("pesoKg")!.scoreZ).toBeCloseTo(-0.46, 2);
    });

    it("escala linealmente los perímetros y pliegues", () => {
      expect(porVariable.get("circCinturaMinima")!.valorAjustado).toBeCloseTo(
        74.07,
        1,
      );
      expect(porVariable.get("circCinturaMinima")!.scoreZ).toBeCloseTo(0.485, 3);
      expect(porVariable.get("pliegueTricipital")!.scoreZ).toBeCloseTo(
        -2.46,
        2,
      );
      expect(porVariable.get("diamHumeral")!.scoreZ).toBeCloseTo(1.14, 2);
    });

    it("deja la cabeza sin escalar: no crece con la talla", () => {
      const cabeza = porVariable.get("circCabeza")!;
      expect(cabeza.valorAjustado).toBeCloseTo(56.5, 2);
      expect(cabeza.scoreZ).toBeCloseTo(0.347, 2);
    });
  });

  describe("índices", () => {
    const i = resultado.indices;

    it("calcula IMC, cintura/cadera y superficie corporal", () => {
      expect(i.imc).toBeCloseTo(23.73, 2);
      expect(i.indiceCinturaCadera).toBeCloseTo(0.824, 3);
      expect(i.riesgoCinturaCadera).toBe("BAJO");
      expect(i.superficieCorporalM2).toBeCloseTo(2.191, 2);
      expect(i.superficiePorKg).toBeCloseTo(247.85, 1);
    });

    it("calcula los índices del fraccionamiento", () => {
      expect(i.sumatoria6Pliegues).toBe(35);
      expect(i.indiceMusculoOseo).toBeCloseTo(3.9548, 2);
      expect(i.indiceAdiposoMuscular).toBeCloseTo(0.358, 2);
      expect(i.indiceMuscularLastre).toBeCloseTo(1.0553, 2);
      expect(i.indiceLastre).toBeCloseTo(1.1547, 2);
      expect(i.indiceCormico).toBeCloseTo(50.26, 2);
    });
  });

  describe("energía", () => {
    const e = resultado.energia!;

    it("calcula el peso ideal OMS con su rango de ±10 %", () => {
      expect(e.pesoIdealKg).toBeCloseTo(85.673, 2);
      expect(e.pesoIdealMinKg).toBeCloseTo(77.105, 2);
      expect(e.pesoIdealMaxKg).toBeCloseTo(94.24, 2);
    });

    it("ajusta el peso del MB sumando el 25 % del excedente", () => {
      expect(e.pesoParaMetabolismoKg).toBeCloseTo(86.35, 2);
      // La planilla calcula el MB sobre ese peso ajustado, no sobre los 88,4 kg.
      expect(e.metabolismoBasalKcal).toBeCloseTo(2032.9, 1);
      expect(e.metabolismoKleiberKcal).toBeCloseTo(1948.88, 1);
    });

    it("aplica el factor de actividad de la OMS", () => {
      expect(e.factorActividad).toBe(2.1);
      expect(e.gastoEnergeticoTotalKcal).toBeCloseTo(4269.11, 0);
    });

    it("deriva la masa libre de grasa del fraccionamiento", () => {
      expect(e.masaLibreGrasaKg).toBeCloseTo(72.132, 2);
      expect(e.metabolismoCunninghamKcal).toBeCloseTo(1928.05, 0);
    });
  });
});

describe("calcularComposicion — mediciones incompletas", () => {
  const soloBasicos: MedidasComposicion = {
    ...MEDIDAS_PLANILLA,
    tallaSentadoCm: null,
    circCabeza: null,
    pliegueMuslo: null,
  };

  it("calcula lo que puede y no rompe por las medidas ausentes", () => {
    const resultado = calcularComposicion(soloBasicos, CONTEXTO_PLANILLA);

    expect(resultado.fraccionamiento).toBeNull();
    expect(resultado.indices.imc).toBeCloseTo(23.73, 2);
    expect(resultado.indices.indiceCinturaCadera).toBeCloseTo(0.824, 3);
    expect(resultado.energia).not.toBeNull();
    expect(resultado.phantom.length).toBeGreaterThan(0);
  });

  it("informa exactamente qué medidas faltan para el fraccionamiento", () => {
    const resultado = calcularComposicion(soloBasicos, CONTEXTO_PLANILLA);
    const bloque = resultado.faltantes.find(
      (f) => f.bloque === "FRACCIONAMIENTO",
    )!;

    expect(bloque.campos).toEqual([
      "Talla sentado",
      "Perímetro de cabeza",
      "Pliegue de muslo",
    ]);
  });

  it("el somatotipo sobrevive a la falta de medidas que no usa", () => {
    const resultado = calcularComposicion(soloBasicos, CONTEXTO_PLANILLA);
    expect(resultado.somatotipo!.mesomorfia).toBeCloseTo(4.7, 1);
  });

  it("sin talla no hay fraccionamiento, somatotipo ni perfil Phantom", () => {
    const resultado = calcularComposicion(
      { ...MEDIDAS_PLANILLA, tallaCm: null },
      CONTEXTO_PLANILLA,
    );

    expect(resultado.fraccionamiento).toBeNull();
    expect(resultado.somatotipo).toBeNull();
    expect(resultado.phantom).toEqual([]);
    expect(resultado.indices.imc).toBeNull();
    // La sumatoria de pliegues no depende de la talla: se sigue informando.
    expect(resultado.indices.sumatoria6Pliegues).toBe(35);
  });

  it("sin sexo no hay fraccionamiento ni energía: son constantes por sexo", () => {
    const resultado = calcularComposicion(MEDIDAS_PLANILLA, {
      sexo: null,
      edadAnios: 26.64,
      nivelActividad: null,
    });

    expect(resultado.fraccionamiento).toBeNull();
    expect(resultado.energia).toBeNull();
    expect(
      resultado.faltantes.find((f) => f.bloque === "ENERGIA")!.campos,
    ).toContain("Sexo biológico del paciente");
  });

  it("sin nivel de actividad calcula el MB pero no el gasto total", () => {
    const resultado = calcularComposicion(MEDIDAS_PLANILLA, {
      ...CONTEXTO_PLANILLA,
      nivelActividad: null,
    });

    expect(resultado.energia!.metabolismoBasalKcal).toBeCloseTo(2032.9, 1);
    expect(resultado.energia!.factorActividad).toBeNull();
    expect(resultado.energia!.gastoEnergeticoTotalKcal).toBeNull();
  });

  it("trata el 0 como ausencia de medida, no como un valor válido", () => {
    const resultado = calcularComposicion(
      { ...MEDIDAS_PLANILLA, circCadera: 0 },
      CONTEXTO_PLANILLA,
    );
    expect(resultado.indices.indiceCinturaCadera).toBeNull();
  });
});

describe("calcularComposicion — mujer bajo el peso ideal", () => {
  it("usa las constantes femeninas y no ajusta el peso del MB", () => {
    const resultado = calcularComposicion(
      { ...MEDIDAS_PLANILLA, pesoKg: 55, tallaCm: 165 },
      { sexo: "FEMENINO", edadAnios: 34, nivelActividad: "MODERADA" },
    );
    const e = resultado.energia!;

    // Peso ideal = 1,65² × 21,5 = 58,53 kg; 55 < 58,53 → MB sobre el peso real.
    expect(e.pesoIdealKg).toBeCloseTo(58.53, 2);
    expect(e.pesoParaMetabolismoKg).toBe(55);
    expect(e.metabolismoBasalKcal).toBeCloseTo(1303.7, 1);
    expect(e.factorActividad).toBe(1.6);
  });
});

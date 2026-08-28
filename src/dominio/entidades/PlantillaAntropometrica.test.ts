import { describe, it, expect } from "vitest";
import {
  PlantillaAntropometrica,
  alcanceDe,
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
  type CampoPlantilla,
} from "./PlantillaAntropometrica";
import { PLANTILLAS_BASE } from "./plantillasBase";
import { ErrorValidacion } from "../errores/ErrorValidacion";
import { calcularComposicion } from "../servicios/composicionCorporal";
import type { MedidasComposicion } from "../servicios/composicionCorporal";

/** Nombres de las ecuaciones habilitadas, sin el detalle de sexo. */
function metodos(alcance: ReturnType<typeof alcanceDe>): string[] {
  return alcance.metodosGrasa.map((m) => m.metodo);
}

/** Solo las que sirven para cualquier paciente. */
function soloAmbos(alcance: ReturnType<typeof alcanceDe>): string[] {
  return alcance.metodosGrasa
    .filter((m) => m.sexo === "AMBOS")
    .map((m) => m.metodo);
}

const SEIS_PLIEGUES: CampoPlantilla[] = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
];

describe("alcanceDe", () => {
  it("con los 6 pliegues resuelve Yuhasz/Carter y Faulkner en ambos sexos", () => {
    const alcance = alcanceDe(SEIS_PLIEGUES);

    expect(soloAmbos(alcance)).toEqual([
      "YUHASZ_CARTER",
      "YUHASZ_CARTER_KERR",
      "FAULKNER",
      "FAULKNER_KERR",
    ]);
    expect(alcance.cincoMasas).toBe(false);
    expect(alcance.faltaParaServir).toEqual([]);
  });

  it("con 4 pliegues resuelve Faulkner pero no Yuhasz", () => {
    const alcance = alcanceDe(SEIS_PLIEGUES.slice(0, 4));
    expect(metodos(alcance)).toEqual(["FAULKNER", "FAULKNER_KERR"]);
  });

  it("sin bicipital, Withers queda habilitado SOLO para mujeres", () => {
    // La Σ4 femenina de Withers no usa abdominal ni muslo; la masculina pide
    // los 7 pliegues. Decir "resuelve Withers" a secas sería engañoso.
    const alcance = alcanceDe(SEIS_PLIEGUES);
    const withers = alcance.metodosGrasa.find((m) => m.metodo === "WITHERS");

    expect(withers?.sexo).toBe("FEMENINO");
  });

  it("con el bicipital, Withers sirve para cualquier paciente", () => {
    const alcance = alcanceDe([...SEIS_PLIEGUES, "pliegueBicipital"]);
    const withers = alcance.metodosGrasa.find((m) => m.metodo === "WITHERS");

    expect(withers?.sexo).toBe("AMBOS");
  });

  it("Durnin & Womersley exige cresta ilíaca, no supraespinal", () => {
    const conSupraespinal = alcanceDe([...SEIS_PLIEGUES, "pliegueBicipital"]);
    expect(metodos(conSupraespinal)).not.toContain("DURNIN_WOMERSLEY");

    const conCresta = alcanceDe([
      ...SEIS_PLIEGUES,
      "pliegueBicipital",
      "pliegueCrestaIliaca",
    ]);
    expect(metodos(conCresta)).toContain("DURNIN_WOMERSLEY");
  });

  it("dice qué falta cuando la plantilla no resuelve nada", () => {
    const alcance = alcanceDe(["pliegueTricipital", "circCadera"]);

    expect(alcance.metodosGrasa).toEqual([]);
    expect(alcance.cincoMasas).toBe(false);
    expect(alcance.faltaParaServir).toEqual([
      "Pliegue subescapular",
      "Pliegue supraespinal",
      "Pliegue abdominal",
    ]);
  });

  it("el perfil ISAK completo habilita las 5 masas y el somatotipo", () => {
    const isak = PLANTILLAS_BASE.find((p) => p.clave === "ISAK_COMPLETO")!;
    const alcance = alcanceDe(isak.campos);

    expect(alcance.cincoMasas).toBe(true);
    expect(alcance.somatotipo).toBe(true);
    expect(soloAmbos(alcance)).toHaveLength(6);
  });
});

describe("alcanceDe — coherencia con el cálculo real", () => {
  /** Medición con valores en exactamente los campos de la plantilla. */
  function medicionCon(campos: readonly CampoPlantilla[]): MedidasComposicion {
    const incluidos = new Set<string>(campos);
    const valor = (campo: string): number | null =>
      incluidos.has(campo) ? 10 : null;

    return {
      pesoKg: 80,
      tallaCm: incluidos.has("tallaCm") ? 175 : null,
      tallaSentadoCm: incluidos.has("tallaSentadoCm") ? 92 : null,
      diamBiacromial: valor("diamBiacromial"),
      diamToraxTransverso: valor("diamToraxTransverso"),
      diamToraxAnteroposterior: valor("diamToraxAnteroposterior"),
      diamBiiliocrestideo: valor("diamBiiliocrestideo"),
      diamHumeral: valor("diamHumeral"),
      diamFemoral: valor("diamFemoral"),
      circCabeza: incluidos.has("circCabeza") ? 56 : null,
      circBrazo: valor("circBrazo"),
      circBrazoContraido: valor("circBrazoContraido"),
      circAntebrazo: valor("circAntebrazo"),
      circTorax: valor("circTorax"),
      circCinturaMinima: valor("circCinturaMinima"),
      circCadera: valor("circCadera"),
      circMusloMaximo: valor("circMusloMaximo"),
      circMusloMedial: valor("circMusloMedial"),
      circPantorrilla: valor("circPantorrilla"),
      pliegueTricipital: valor("pliegueTricipital"),
      pliegueSubescapular: valor("pliegueSubescapular"),
      pliegueSupraespinal: valor("pliegueSupraespinal"),
      pliegueAbdominal: valor("pliegueAbdominal"),
      pliegueMuslo: valor("pliegueMuslo"),
      plieguePantorrilla: valor("plieguePantorrilla"),
      pliegueBicipital: valor("pliegueBicipital"),
      pliegueCrestaIliaca: valor("pliegueCrestaIliaca"),
    };
  }

  /**
   * `alcanceDe` duplica, en forma de listas, lo que exigen
   * `composicionCorporal` y `grasaPorPliegues`. Si allá cambia un requisito y
   * acá no, la plantilla prometería resultados que después no aparecen. Este
   * test compara las dos fuentes contra cada plantilla de fábrica.
   */
  it("lo que promete la plantilla es lo que el cálculo entrega", () => {
    for (const base of PLANTILLAS_BASE) {
      const prometido = alcanceDe(base.campos);
      const real = calcularComposicion(medicionCon(base.campos), {
        sexo: "MASCULINO",
        edadAnios: 30,
        nivelActividad: null,
      });

      expect(prometido.cincoMasas, `5 masas en «${base.nombre}»`).toBe(
        real.fraccionamiento != null,
      );
      expect(prometido.somatotipo, `somatotipo en «${base.nombre}»`).toBe(
        real.somatotipo != null,
      );

      // El cálculo real se corrió como varón, así que se comparan las
      // ecuaciones que la plantilla promete para varones.
      const realesVaron = real.grasaPorPliegues.resultados.map((r) => r.metodo);
      const prometidasVaron = prometido.metodosGrasa
        .filter((m) => m.sexo === "AMBOS" || m.sexo === "MASCULINO")
        .map((m) => m.metodo);
      for (const metodo of prometidasVaron) {
        expect(realesVaron, `${metodo} en «${base.nombre}»`).toContain(metodo);
      }
    }
  });
});

describe("PlantillaAntropometrica", () => {
  it("crea una plantilla válida y normaliza los campos", () => {
    const plantilla = PlantillaAntropometrica.crear(
      {
        nombre: "  Mi plantilla  ",
        // Desordenados y con un duplicado: se normaliza al orden ISAK.
        campos: [
          "pliegueAbdominal",
          "pliegueTricipital",
          "pliegueTricipital",
          "pliegueSupraespinal",
          "pliegueSubescapular",
        ],
      },
      "pl-1",
    );

    expect(plantilla.nombre).toBe("Mi plantilla");
    expect(plantilla.campos).toEqual([
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "pliegueAbdominal",
    ]);
  });

  it("descarta campos desconocidos en vez de romper", () => {
    const plantilla = PlantillaAntropometrica.crear(
      {
        nombre: "Con basura",
        campos: [...SEIS_PLIEGUES, "inventado" as CampoPlantilla],
      },
      "pl-1",
    );
    expect(plantilla.campos).toEqual(SEIS_PLIEGUES);
  });

  it("rechaza una plantilla que no permite calcular nada", () => {
    expect(() =>
      PlantillaAntropometrica.crear(
        { nombre: "Inservible", campos: ["circCadera", "circCinturaMinima"] },
        "pl-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("el error dice exactamente qué pliegues faltan", () => {
    try {
      PlantillaAntropometrica.crear(
        {
          nombre: "Casi",
          campos: ["pliegueTricipital", "pliegueSubescapular"],
        },
        "pl-1",
      );
      throw new Error("tendría que haber fallado");
    } catch (error) {
      expect((error as Error).message).toContain("pliegue supraespinal");
      expect((error as Error).message).toContain("pliegue abdominal");
    }
  });

  it("rechaza el nombre vacío", () => {
    expect(() =>
      PlantillaAntropometrica.crear(
        { nombre: "   ", campos: SEIS_PLIEGUES },
        "pl-1",
      ),
    ).toThrow(ErrorValidacion);
  });

  it("actualizar revalida y preserva la fecha de creación", () => {
    const original = PlantillaAntropometrica.crear(
      { nombre: "Original", campos: SEIS_PLIEGUES },
      "pl-1",
      new Date("2026-01-01"),
    );

    const editada = original.actualizar(
      { nombre: "Editada" },
      new Date("2026-06-01"),
    );

    expect(editada.nombre).toBe("Editada");
    expect(editada.aPrimitivos().creadoEn).toEqual(new Date("2026-01-01"));
    expect(editada.aPrimitivos().actualizadoEn).toEqual(new Date("2026-06-01"));

    // Recortarla hasta que no sirva sigue estando prohibido al editar.
    expect(() => original.actualizar({ campos: ["circCadera"] })).toThrow(
      ErrorValidacion,
    );
  });

  it("todo campo elegible tiene etiqueta", () => {
    for (const campo of CAMPOS_PLANTILLA) {
      expect(ETIQUETAS_CAMPO_PLANTILLA[campo]).toBeTruthy();
    }
  });
});

describe("PLANTILLAS_BASE", () => {
  it("todas son válidas como plantilla", () => {
    for (const base of PLANTILLAS_BASE) {
      expect(() =>
        PlantillaAntropometrica.crear(
          { nombre: base.nombre, campos: base.campos },
          "pl-1",
        ),
      ).not.toThrow();
    }
  });

  it("no repiten clave ni usan campos inexistentes", () => {
    const claves = PLANTILLAS_BASE.map((p) => p.clave);
    expect(new Set(claves).size).toBe(claves.length);

    for (const base of PLANTILLAS_BASE) {
      for (const campo of base.campos) {
        expect(CAMPOS_PLANTILLA).toContain(campo);
      }
    }
  });
});

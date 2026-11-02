import { describe, it, expect } from "vitest";
import {
  PlanificacionDeportiva,
  compararConObjetivo,
  formatearMinutos,
  horaDeIngesta,
  kmEstimadoDeIngesta,
  type DatosNuevaPlanificacion,
} from "./PlanificacionDeportiva";
import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Tests de la planificación deportiva de una carrera (migración 94).
 *
 * Lo que fijan: qué cuenta para los valores POR HORA (solo lo que cae entre
 * la largada y la llegada estimada), cómo se suman los líquidos (los
 * alimentos en ml), la hora del día y el km estimado de cada ingesta, y las
 * validaciones que no dejan guardar una ingesta fuera de la carrera.
 */

let siguiente = 0;
const generarId = (): string => `id-${++siguiente}`;

/** Un gel de 25 g de carbohidratos (100 g → 250 kcal, 62,5 g de C) en 40 g. */
const GEL = {
  nombre: "Gel de carbohidratos",
  cantidadGramos: 40,
  caloriasPor100: 250,
  carbohidratosPor100: 62.5,
  proteinasPor100: 0,
  grasasPor100: 0,
};

/** 200 ml de bebida isotónica (6 g de C por 100 ml). */
const ISOTONICA = {
  nombre: "Bebida isotónica",
  unidadBase: "MILILITRO" as const,
  cantidadGramos: 200,
  caloriasPor100: 24,
  carbohidratosPor100: 6,
};

function maraton(
  cambios: Partial<DatosNuevaPlanificacion> = {},
): PlanificacionDeportiva {
  return PlanificacionDeportiva.crear(
    {
      tipo: "CARRERA",
      nombre: "Maratón — 3:00",
      carrera: {
        modalidad: "CALLE",
        distanciaKm: 42.2,
        duracionEstimadaMin: 180,
        horaLargada: "07:00",
        carbohidratosObjetivoGH: 60,
        liquidosObjetivoMlH: 400,
      },
      ingestas: [
        // Desordenadas a propósito: la entidad las ordena por tiempo.
        { minuto: 90, alimentos: [GEL, ISOTONICA] },
        { minuto: -15, alimentos: [GEL] },
        { minuto: 45, alimentos: [GEL] },
        { minuto: 135, alimentos: [GEL, ISOTONICA] },
      ],
      ...cambios,
    },
    "pla-1",
    generarId,
  );
}

describe("PlanificacionDeportiva — reglas", () => {
  it("ordena las ingestas por tiempo", () => {
    const p = maraton();
    expect(p.ingestas.map((i) => i.minuto)).toEqual([-15, 45, 90, 135]);
    expect(p.ingestas.map((i) => i.orden)).toEqual([0, 1, 2, 3]);
  });

  it("una carrera necesita distancia y duración", () => {
    expect(() => maraton({ carrera: null })).toThrow(ErrorValidacion);
    expect(() =>
      maraton({
        carrera: {
          modalidad: "CALLE",
          distanciaKm: 0,
          duracionEstimadaMin: 60,
        },
      }),
    ).toThrow(/distancia/);
    expect(() =>
      maraton({
        carrera: {
          modalidad: "CALLE",
          distanciaKm: 10,
          duracionEstimadaMin: 0,
        },
      }),
    ).toThrow(/duración/);
  });

  it("no deja una ingesta después de la llegada estimada ni en un km fuera de la carrera", () => {
    expect(() =>
      maraton({ ingestas: [{ minuto: 181, alimentos: [GEL] }] }),
    ).toThrow(/después de la llegada/);
    expect(() =>
      maraton({ ingestas: [{ minuto: 60, km: 43, alimentos: [GEL] }] }),
    ).toThrow(/km 43/);
    expect(() =>
      maraton({ ingestas: [{ minuto: -721, alimentos: [GEL] }] }),
    ).toThrow(/12 horas/);
  });

  it("una ingesta sin alimentos vale si tiene una indicación, y no si está vacía", () => {
    expect(
      maraton({ ingestas: [{ minuto: 30, notas: "Agua a demanda" }] }).ingestas,
    ).toHaveLength(1);
    expect(() => maraton({ ingestas: [{ minuto: 30 }] })).toThrow(
      /no tiene alimentos/,
    );
  });

  it("editar no cambia el tipo ni la carpeta", () => {
    const p = maraton({ grupoId: "carpeta-1" });
    const editada = p.actualizar(
      {
        nombre: "Otra",
        carrera: {
          modalidad: "TRAIL",
          distanciaKm: 21,
          duracionEstimadaMin: 150,
        },
      },
      generarId,
    );
    expect(editada.tipo).toBe("CARRERA");
    expect(editada.grupoId).toBe("carpeta-1");
    expect(editada.carrera?.modalidad).toBe("TRAIL");
    expect(editada.ingestas).toHaveLength(0);
  });

  it("duplicar copia todo con ids nuevos, en la misma carpeta", () => {
    const p = maraton({ grupoId: "carpeta-1" });
    const copia = p.duplicar("pla-2", "Maratón (copia)", generarId);
    expect(copia.id).toBe("pla-2");
    expect(copia.grupoId).toBe("carpeta-1");
    expect(copia.ingestas.map((i) => i.minuto)).toEqual([-15, 45, 90, 135]);
    expect(copia.ingestas[0]!.id).not.toBe(p.ingestas[0]!.id);
    expect(copia.resumen).toEqual(p.resumen);
  });
});

describe("PlanificacionDeportiva — resumen", () => {
  it("los valores por hora suman solo lo de la carrera, no lo de antes de largar", () => {
    const r = maraton().resumen;
    // Durante: 3 geles (75 g de C) + 2 isotónicas (24 g de C, 400 ml) en 3 h.
    expect(r.durante.cantidad).toBe(3);
    expect(r.durante.macros.carbohidratosG).toBe(99);
    expect(r.durante.porHora.carbohidratosG).toBe(33);
    expect(r.durante.liquidosMl).toBe(400);
    expect(r.durante.porHora.liquidosMl).toBe(133);
    // Antes: el gel de -0:15.
    expect(r.antes.cantidad).toBe(1);
    expect(r.antes.macros.carbohidratosG).toBe(25);
    expect(r.antes.liquidosMl).toBeNull();
  });

  it("compara contra los objetivos por hora con ±10 %", () => {
    const r = maraton().resumen;
    expect(r.carbohidratos).toBe("DEBAJO");
    expect(r.liquidos).toBe("DEBAJO");
    expect(compararConObjetivo(57, 60)).toBe("CUMPLE");
    expect(compararConObjetivo(67, 60)).toBe("ENCIMA");
    expect(compararConObjetivo(54, 60)).toBe("CUMPLE");
    expect(compararConObjetivo(53.9, 60)).toBe("DEBAJO");
    expect(compararConObjetivo(50, null)).toBeNull();
  });

  it("el mayor tramo sin ingerir cuenta desde la largada y hasta la llegada", () => {
    // 0 → 45 → 90 → 135 → 180: tramos de 45 min.
    expect(maraton().resumen.intervaloMaximoMin).toBe(45);
    const sinIngestas = maraton({ ingestas: [] }).resumen;
    expect(sinIngestas.intervaloMaximoMin).toBe(180);
    expect(sinIngestas.durante.macros.carbohidratosG).toBeNull();
    expect(sinIngestas.carbohidratos).toBeNull();
  });

  it("el ritmo sale de la duración y la distancia", () => {
    expect(maraton().ritmoMinPorKm).toBe(4.27);
  });
});

describe("hora y kilómetro de cada ingesta", () => {
  it("suma el tiempo de carrera a la hora de largada y da la vuelta al día", () => {
    expect(horaDeIngesta("07:00", 95)).toBe("08:35");
    expect(horaDeIngesta("07:00", -30)).toBe("06:30");
    expect(horaDeIngesta("22:00", 180)).toBe("01:00");
    expect(horaDeIngesta(null, 30)).toBeNull();
  });

  it("estima el km a ritmo parejo solo en calle", () => {
    const calle = maraton().carrera;
    expect(kmEstimadoDeIngesta(calle, 90)).toBe(21.1);
    expect(kmEstimadoDeIngesta(calle, -10)).toBeNull();
    const trail = maraton({
      carrera: {
        modalidad: "TRAIL",
        distanciaKm: 30,
        duracionEstimadaMin: 240,
      },
    }).carrera;
    expect(kmEstimadoDeIngesta(trail, 120)).toBeNull();
  });

  it("formatea los minutos como tiempo de carrera", () => {
    expect(formatearMinutos(95)).toBe("1:35");
    expect(formatearMinutos(-30)).toBe("-0:30");
    expect(formatearMinutos(0)).toBe("0:00");
  });
});

describe("PlanificacionDeportiva — cafeína (migración 96)", () => {
  /** Un gel de 40 g con 40 mg de cafeína: 100 mg por 100 g. */
  const GEL_CAFEINA = { ...GEL, nombre: "Gel con cafeína", cafeinaPor100: 100 };

  function conCafeina(pesoReferenciaKg: number | null) {
    return maraton({
      pesoReferenciaKg,
      ingestas: [
        { minuto: -30, alimentos: [GEL_CAFEINA] },
        { minuto: 60, alimentos: [GEL_CAFEINA, ISOTONICA] },
        { minuto: 120, alimentos: [GEL_CAFEINA] },
      ],
    });
  }

  it("suma la cafeína de antes y de durante, por hora y por kg", () => {
    const { cafeina } = conCafeina(70).resumen;
    expect(cafeina).toEqual({
      antesMg: 40,
      duranteMg: 80,
      totalMg: 120,
      // 80 mg en las 3 h de carrera.
      porHoraMg: 27,
      // 120 mg para 70 kg.
      mgPorKg: 1.7,
    });
  });

  it("sin peso no hay mg/kg, y sin ningún alimento con cafeína no hay dato", () => {
    expect(conCafeina(null).resumen.cafeina.mgPorKg).toBeNull();
    expect(maraton().resumen.cafeina).toEqual({
      antesMg: null,
      duranteMg: null,
      totalMg: null,
      porHoraMg: null,
      mgPorKg: null,
    });
  });

  it("el peso tiene que ser razonable, y la copia lo conserva", () => {
    expect(() => conCafeina(10)).toThrow(/peso del deportista/);
    expect(() => conCafeina(400)).toThrow(/peso del deportista/);
    const copia = conCafeina(70).duplicar("pla-9", "Copia", generarId);
    expect(copia.aPrimitivos().pesoReferenciaKg).toBe(70);
    expect(copia.resumen.cafeina.totalMg).toBe(120);
  });
});

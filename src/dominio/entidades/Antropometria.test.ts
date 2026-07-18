import { describe, it, expect } from "vitest";
import { Antropometria } from "./Antropometria";
import { ErrorValidacion } from "../errores/ErrorValidacion";

const AHORA = new Date("2026-07-14T12:00:00Z");

/**
 * Caso real de la planilla del profesional (paciente Ahumada Gerónimo):
 * 6 consultas entre 5/2024 y 3/2025. Los derivados esperados (Σ6 pliegues y
 * kg bajados) son exactamente los de su Excel.
 */
const CONSULTAS_REALES = [
  {
    fecha: "2024-05-17",
    pesoKg: 81.3,
    pliegues: { tri: 10.5, sub: 15, sup: 19, abd: 24, mus: 18, pan: 13 },
  },
  {
    fecha: "2024-06-18",
    pesoKg: 77.5,
    pliegues: { tri: 10, sub: 15, sup: 13, abd: 17, mus: 16, pan: 11 },
  },
  {
    fecha: "2024-07-19",
    pesoKg: 76.6,
    pliegues: { tri: 10, sub: 13, sup: 12, abd: 17, mus: 14, pan: 11 },
  },
  {
    fecha: "2024-09-13",
    pesoKg: 75,
    pliegues: { tri: 10, sub: 13, sup: 11, abd: 16.5, mus: 14, pan: 10 },
  },
  {
    fecha: "2024-12-13",
    pesoKg: 74.1,
    pliegues: { tri: 10, sub: 13, sup: 10, abd: 16, mus: 14, pan: 10 },
  },
  {
    fecha: "2025-03-18",
    pesoKg: 77.9,
    pliegues: { tri: 10, sub: 15, sup: 15, abd: 23, mus: 16, pan: 9 },
  },
];

function medicionesReales(): Antropometria[] {
  return CONSULTAS_REALES.map((consulta, indice) =>
    Antropometria.crear(
      {
        pacienteId: "pac-1",
        fecha: new Date(consulta.fecha),
        pesoKg: consulta.pesoKg,
        pliegueTricipital: consulta.pliegues.tri,
        pliegueSubescapular: consulta.pliegues.sub,
        pliegueSupraespinal: consulta.pliegues.sup,
        pliegueAbdominal: consulta.pliegues.abd,
        pliegueMuslo: consulta.pliegues.mus,
        plieguePantorrilla: consulta.pliegues.pan,
      },
      `ant-${indice}`,
      AHORA,
    ),
  );
}

describe("Antropometria", () => {
  it("reproduce la sumatoria de 6 pliegues de la planilla del profesional", () => {
    const sumatorias = medicionesReales().map((m) => m.sumatoria6Pliegues());
    expect(sumatorias).toEqual([99.5, 82, 77, 74.5, 73, 88]);
  });

  it("reproduce los kg bajados por consulta de la planilla (incluida una suba)", () => {
    const derivados = Antropometria.calcularDerivados(medicionesReales());
    expect(derivados.map((d) => d.kgBajadosVsAnterior)).toEqual([
      null, 3.8, 0.9, 1.6, 0.9, -3.8,
    ]);
  });

  it("calcula los kg bajados acumulados desde la primera consulta", () => {
    const derivados = Antropometria.calcularDerivados(medicionesReales());
    expect(derivados.at(-1)?.kgBajadosAcumulados).toBeCloseTo(3.4, 2);
  });

  it("devuelve null en la sumatoria si falta alguno de los 6 pliegues", () => {
    const medicion = Antropometria.crear(
      {
        pacienteId: "pac-1",
        fecha: new Date("2026-07-01"),
        pesoKg: 80,
        pliegueTricipital: 10,
        // faltan los demás
      },
      "ant-x",
      AHORA,
    );
    expect(medicion.sumatoria6Pliegues()).toBeNull();
  });

  it("ordena por fecha antes de calcular derivados", () => {
    const [primera, segunda] = medicionesReales();
    const derivados = Antropometria.calcularDerivados([segunda!, primera!]);
    expect(derivados[1]?.kgBajadosVsAnterior).toBe(3.8);
  });

  it("rechaza peso, pliegues y fechas fuera de rango", () => {
    const base = { pacienteId: "pac-1", fecha: new Date("2026-07-01") };
    expect(() =>
      Antropometria.crear({ ...base, pesoKg: 10 }, "a", AHORA),
    ).toThrow(ErrorValidacion);
    expect(() =>
      Antropometria.crear({ ...base, pesoKg: 80, pliegueMuslo: 95 }, "a", AHORA),
    ).toThrow(ErrorValidacion);
    expect(() =>
      Antropometria.crear(
        { pacienteId: "pac-1", fecha: new Date("2026-08-01"), pesoKg: 80 },
        "a",
        AHORA,
      ),
    ).toThrow(ErrorValidacion);
  });

  it("actualizar preserva id, paciente y creadoEn, y revalida", () => {
    const medicion = medicionesReales()[0]!;
    const actualizada = medicion.actualizar({ pesoKg: 79.5 }, AHORA);
    expect(actualizada.id).toBe(medicion.id);
    expect(actualizada.pacienteId).toBe(medicion.pacienteId);
    expect(actualizada.creadoEn).toEqual(medicion.creadoEn);
    expect(actualizada.pesoKg).toBe(79.5);
    expect(() => medicion.actualizar({ pesoKg: 500 }, AHORA)).toThrow(ErrorValidacion);
  });
});

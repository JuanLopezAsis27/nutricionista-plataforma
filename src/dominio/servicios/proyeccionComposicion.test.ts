import { describe, it, expect } from "vitest";
import { proyectarObjetivo, type PuntoSerie } from "./proyeccionComposicion";

const HOY = new Date("2026-03-01T00:00:00Z");

/** Serie de masa adiposa bajando 0,5 kg por semana durante 4 semanas. */
const BAJANDO: PuntoSerie[] = [
  { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
  { fecha: new Date("2026-02-08T00:00:00Z"), valor: 19.5 },
  { fecha: new Date("2026-02-15T00:00:00Z"), valor: 19 },
  { fecha: new Date("2026-02-22T00:00:00Z"), valor: 18.5 },
];

describe("proyectarObjetivo", () => {
  it("sin mediciones no proyecta nada", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      [],
      HOY,
    );
    expect(p.estado).toBe("SIN_DATOS");
    expect(p.valorActual).toBeNull();
    expect(p.ritmoSemanal).toBeNull();
  });

  it("con una sola medición informa la brecha pero no el ritmo", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      [BAJANDO[0]!],
      HOY,
    );
    expect(p.valorActual).toBe(20);
    expect(p.brecha).toBe(-5);
    expect(p.ritmoSemanal).toBeNull();
    expect(p.estado).toBe("SIN_DATOS");
  });

  it("estima el ritmo semanal por regresión sobre toda la serie", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.ritmoSemanal).toBeCloseTo(-0.5, 3);
    expect(p.valorInicial).toBe(20);
    expect(p.valorActual).toBe(18.5);
    expect(p.brecha).toBe(-3.5);
    expect(p.estado).toBe("EN_CAMINO");
  });

  it("amortigua una medición fuera de línea en vez de seguirla", () => {
    // Un pico aislado en la última consulta (paciente recién comido).
    const conPico: PuntoSerie[] = [
      ...BAJANDO.slice(0, 3),
      { fecha: new Date("2026-02-22T00:00:00Z"), valor: 20.5 },
    ];
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      conPico,
      HOY,
    );
    // Restar extremos daría +0,167 kg/semana; la regresión, que ve las cuatro
    // mediciones, se queda en +0,1: el pico pesa, pero no manda.
    expect(p.ritmoSemanal).toBeCloseTo(0.1, 2);
    expect(Math.abs(p.ritmoSemanal!)).toBeLessThan(0.167);
  });

  it("calcula el progreso como fracción del camino recorrido", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    // De 20 a 15 hay 5 kg; ya bajó 1,5 → 30 %.
    expect(p.progresoPorcentaje).toBeCloseTo(30, 1);
  });

  it("marca ALCANZADO cuando se llegó al valor objetivo", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 18.5, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.estado).toBe("ALCANZADO");
    expect(p.progresoPorcentaje).toBe(100);
  });

  it("marca ALCANZADO también si se pasó de largo en la dirección buscada", () => {
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 19, fechaObjetivo: null },
      BAJANDO,
      HOY,
    );
    expect(p.estado).toBe("ALCANZADO");
  });

  it("marca ALEJANDOSE cuando la variable se mueve al revés", () => {
    const subiendo: PuntoSerie[] = BAJANDO.map((punto, i) => ({
      fecha: punto.fecha,
      valor: 18.5 + i * 0.5,
    }));
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      subiendo,
      HOY,
    );
    expect(p.ritmoSemanal).toBeGreaterThan(0);
    expect(p.estado).toBe("ALEJANDOSE");
  });

  describe("con fecha objetivo", () => {
    it("EN_CAMINO si el ritmo actual alcanza para llegar", () => {
      // Faltan 3,5 kg en ~10 semanas → hace falta −0,35/semana; viene a −0,5.
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-05-10T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.ritmoSemanalNecesario).toBeCloseTo(-0.35, 1);
      expect(p.estado).toBe("EN_CAMINO");
    });

    it("ATRASADO si va en la dirección correcta pero demasiado lento", () => {
      // Faltan 3,5 kg en ~4 semanas → hace falta −0,875/semana; viene a −0,5.
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-03-29T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("ATRASADO");
    });

    it("marca VENCIDO cuando la fecha ya pasó sin alcanzar la meta", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-02-20T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("VENCIDO");
      // Sin semanas por delante no hay ritmo necesario que pedir.
      expect(p.ritmoSemanalNecesario).toBeNull();
    });

    it("una fecha vencida no pisa a un objetivo ya alcanzado", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 18.5,
          fechaObjetivo: new Date("2026-02-20T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      expect(p.estado).toBe("ALCANZADO");
    });

    it("proyecta la fecha de llegada y el valor esperado a la fecha meta", () => {
      const p = proyectarObjetivo(
        {
          variable: "MASA_ADIPOSA_KG",
          valorObjetivo: 15,
          fechaObjetivo: new Date("2026-05-10T00:00:00Z"),
        },
        BAJANDO,
        HOY,
      );
      // 3,5 kg a 0,5 kg/semana = 7 semanas desde el 22/02 → 12/04.
      expect(p.fechaProyectada!.toISOString().slice(0, 10)).toBe("2026-04-12");
      // A 11 semanas del 22/02 habría bajado 5,5 kg más: 18,5 − 5,5 = 13.
      expect(p.valorProyectadoAFecha).toBeCloseTo(13, 1);
    });
  });

  it("no proyecta un valor imposible al extrapolar muy lejos", () => {
    // A −0,5 kg/semana durante casi dos años, la recta cruza el cero. Un valor
    // negativo de masa adiposa no significa nada: mejor no dar proyección.
    const p = proyectarObjetivo(
      {
        variable: "MASA_ADIPOSA_KG",
        valorObjetivo: 15,
        fechaObjetivo: new Date("2027-12-01T00:00:00Z"),
      },
      BAJANDO,
      HOY,
    );

    expect(p.valorProyectadoAFecha).toBeNull();
    // La fecha estimada de llegada sí se mantiene: esa sí es alcanzable.
    expect(p.fechaProyectada).not.toBeNull();
  });

  it("no proyecta fecha si el paciente está estancado", () => {
    const plano: PuntoSerie[] = BAJANDO.map((punto) => ({
      fecha: punto.fecha,
      valor: 20,
    }));
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      plano,
      HOY,
    );
    expect(p.ritmoSemanal).toBe(0);
    expect(p.fechaProyectada).toBeNull();
    expect(p.estado).toBe("ALEJANDOSE");
  });

  it("ignora el orden en el que llegan los puntos", () => {
    const desordenada = [...BAJANDO].reverse();
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      desordenada,
      HOY,
    );
    expect(p.valorInicial).toBe(20);
    expect(p.valorActual).toBe(18.5);
  });

  it("no proyecta fecha cuando todas las mediciones son del mismo día", () => {
    const mismoDia: PuntoSerie[] = [
      { fecha: new Date("2026-02-01T00:00:00Z"), valor: 20 },
      { fecha: new Date("2026-02-01T00:00:00Z"), valor: 19 },
    ];
    const p = proyectarObjetivo(
      { variable: "MASA_ADIPOSA_KG", valorObjetivo: 15, fechaObjetivo: null },
      mismoDia,
      HOY,
    );
    expect(p.ritmoSemanal).toBeNull();
    expect(p.estado).toBe("SIN_DATOS");
  });

  it("lleva la etiqueta y la unidad de la variable", () => {
    const p = proyectarObjetivo(
      {
        variable: "INDICE_CINTURA_CADERA",
        valorObjetivo: 0.85,
        fechaObjetivo: null,
      },
      [],
      HOY,
    );
    expect(p.etiqueta).toBe("Índice cintura/cadera");
    expect(p.unidad).toBe("");
  });
});

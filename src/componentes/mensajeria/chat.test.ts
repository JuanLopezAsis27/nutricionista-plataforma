import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  agruparPorDia,
  etiquetaDia,
  etiquetaRelativa,
  horaChat,
  inicialesDe,
} from "./chat";

/**
 * Las fechas de un chat se leen en el huso de quien mira, así que todo lo que
 * se prueba acá se construye con el constructor LOCAL de `Date` (año, mes, día)
 * y nunca con un string ISO en UTC: con `new Date("2026-03-10T23:30:00Z")` el
 * resultado dependería de la zona donde corra el test.
 */
function local(
  ano: number,
  mes: number,
  dia: number,
  hora = 12,
  minuto = 0,
): Date {
  return new Date(ano, mes - 1, dia, hora, minuto);
}

describe("chat — rótulos de fecha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(local(2026, 3, 10, 15, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotula hoy y ayer por nombre, no por fecha", () => {
    expect(etiquetaDia(local(2026, 3, 10, 9, 0))).toBe("Hoy");
    expect(etiquetaDia(local(2026, 3, 9, 23, 50))).toBe("Ayer");
  });

  it("un instante de hoy a las 00:10 sigue siendo Hoy", () => {
    // El cálculo compara DÍAS enteros: restar milisegundos haría que cualquier
    // mensaje de más de 24 h de antigüedad cayera en "Ayer" aunque sea de hoy.
    expect(etiquetaDia(local(2026, 3, 10, 0, 10))).toBe("Hoy");
  });

  it("escribe la fecha cuando pasó más de un día, con el año solo si no es este", () => {
    expect(etiquetaDia(local(2026, 3, 2))).toMatch(/marzo/);
    expect(etiquetaDia(local(2026, 3, 2))).not.toMatch(/2026/);
    expect(etiquetaDia(local(2025, 12, 20))).toMatch(/2025/);
  });

  it("la lista usa hora, Ayer, día de la semana y fecha corta según la distancia", () => {
    expect(etiquetaRelativa(local(2026, 3, 10, 8, 5))).toMatch(
      /^\d{1,2}:\d{2}/,
    );
    expect(etiquetaRelativa(local(2026, 3, 9))).toBe("Ayer");
    // 6 de marzo de 2026 es viernes; entra en la semana.
    expect(etiquetaRelativa(local(2026, 3, 6))).toBe("Viernes");
    expect(etiquetaRelativa(local(2026, 1, 15))).toBe("15/01");
  });

  it("la hora sale en HH:mm", () => {
    expect(horaChat(local(2026, 3, 10, 9, 5))).toMatch(/^\d{1,2}:\d{2}$/);
  });
});

describe("chat — agruparPorDia", () => {
  it("abre un grupo por día local y conserva el orden de llegada", () => {
    const mensajes = [
      { id: "a", creadoEn: local(2026, 3, 8, 10, 0) },
      { id: "b", creadoEn: local(2026, 3, 8, 18, 30) },
      { id: "c", creadoEn: local(2026, 3, 9, 9, 0) },
    ];

    const dias = agruparPorDia(mensajes, (m) => m.creadoEn);

    expect(dias).toHaveLength(2);
    expect(dias.map((d) => d.clave)).toEqual(["2026-03-08", "2026-03-09"]);
    expect(dias.map((d) => d.mensajes.map((m) => m.id))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("un mensaje de la noche no se pasa al día siguiente", () => {
    // Con la clave UTC de `aFechaISO`, las 22 h en Argentina (UTC−3) caen en el
    // día siguiente y abrían un separador de más en medio de la conversación.
    const mensajes = [
      { id: "a", creadoEn: local(2026, 3, 8, 21, 0) },
      { id: "b", creadoEn: local(2026, 3, 8, 22, 30) },
    ];

    const dias = agruparPorDia(mensajes, (m) => m.creadoEn);

    expect(dias).toHaveLength(1);
  });

  it("no devuelve grupos si no hay mensajes", () => {
    expect(agruparPorDia([], () => new Date())).toEqual([]);
  });
});

describe("chat — inicialesDe", () => {
  it("toma la primera letra de las dos primeras palabras", () => {
    expect(inicialesDe("Ana María Pérez")).toBe("AM");
    expect(inicialesDe("Juan")).toBe("J");
    expect(inicialesDe("  ")).toBe("");
  });
});

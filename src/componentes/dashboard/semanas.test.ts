import { describe, it, expect } from "vitest";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { agruparPorSemana, lunesDe, SEMANAS } from "./semanas";

/**
 * Tests del reparto de turnos en semanas.
 *
 * POR QUÉ IMPORTAN: `Turno.fecha` es un DATE que llega como medianoche UTC. Al
 * oeste de Greenwich —donde corre este consultorio—, leer el día con `getDay()`
 * devuelve el día ANTERIOR, y los turnos del lunes caen en la semana pasada.
 * El gráfico seguiría dibujándose igual, con las barras corridas una semana y
 * sin ningún error a la vista. Es la misma trampa que AGENTS documenta para
 * `getUTCDay()` en los turnos.
 */

function turno(
  fecha: string,
  estado: TurnoSalidaDto["estado"],
): TurnoSalidaDto {
  return {
    id: `t-${fecha}-${estado}`,
    pacienteId: "pac-1",
    fecha: new Date(fecha),
    hora: "10:00",
    duracionMinutos: 30,
    estado,
    notas: null,
    precio: null,
    pagado: false,
    creadoEn: new Date(fecha),
  };
}

describe("lunesDe", () => {
  it("devuelve el lunes de esa semana", () => {
    // 2026-09-03 es jueves; su lunes es el 2026-08-31.
    expect(lunesDe("2026-09-03")).toBe("2026-08-31");
  });

  it("un lunes es su propio lunes", () => {
    expect(lunesDe("2026-08-31")).toBe("2026-08-31");
  });

  it("el domingo cierra la semana, no la abre", () => {
    // Con la semana arrancando el domingo (el índice 0 de getDay), este día
    // abriría una semana nueva y quedaría separado de sus compañeros.
    expect(lunesDe("2026-09-06")).toBe("2026-08-31");
  });
});

describe("agruparPorSemana", () => {
  const lunesActual = "2026-08-31";

  it("devuelve siempre la ventana completa de semanas, en orden", () => {
    const filas = agruparPorSemana([], lunesActual);
    expect(filas).toHaveLength(SEMANAS);
    expect(filas[filas.length - 1]!.inicio).toBe(lunesActual);
    // De más vieja a más nueva: el eje se lee de izquierda a derecha.
    expect(filas[0]!.inicio < filas[1]!.inicio).toBe(true);
  });

  it("cuenta el turno del lunes en SU semana y no en la anterior", () => {
    const filas = agruparPorSemana(
      [turno("2026-08-31", "COMPLETADO")],
      lunesActual,
    );
    const semanaActual = filas.find((f) => f.inicio === lunesActual)!;
    expect(semanaActual.agendados).toBe(1);
    expect(semanaActual.completados).toBe(1);
  });

  it("los cancelados no cuentan como agendados", () => {
    // El turno no ocupó la agenda: sumarlo diría que la semana estuvo llena.
    const filas = agruparPorSemana(
      [
        turno("2026-09-01", "CANCELADO"),
        turno("2026-09-02", "CONFIRMADO"),
        turno("2026-09-03", "COMPLETADO"),
      ],
      lunesActual,
    );
    const semanaActual = filas.find((f) => f.inicio === lunesActual)!;
    expect(semanaActual.agendados).toBe(2);
    expect(semanaActual.completados).toBe(1);
  });

  it("ignora los turnos fuera de la ventana", () => {
    const filas = agruparPorSemana(
      [turno("2020-01-02", "COMPLETADO"), turno("2027-01-02", "COMPLETADO")],
      lunesActual,
    );
    expect(filas.every((f) => f.agendados === 0)).toBe(true);
  });
});

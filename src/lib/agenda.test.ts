import { describe, it, expect } from "vitest";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import {
  franjasDelDia,
  esDiaDeAtencion,
  proximoDiaDeAtencion,
  diaSemanaISO,
} from "./agenda";

/** Configuración base: lunes a viernes, 09:00–11:00, paso de 30 minutos. */
function config(
  cambios: Partial<ConfiguracionSalidaDto> = {},
): ConfiguracionSalidaDto {
  return {
    turnoDuracionMinutos: 30,
    turnoPasoMinutos: 30,
    atencionHoraDesde: "09:00",
    atencionHoraHasta: "11:00",
    diasAtencion: [1, 2, 3, 4, 5],
    ...cambios,
  } as ConfiguracionSalidaDto;
}

// 2026-07-01 es miércoles; 2026-07-04, sábado.
const MIERCOLES = "2026-07-01";
const SABADO = "2026-07-04";

const base = {
  config: config(),
  fechaISO: MIERCOLES,
  duracionMinutos: 30,
  ocupados: [],
  hoyISO: "2026-06-01",
  ahoraHHmm: "12:00",
};

describe("agenda", () => {
  it("lee el día de la semana en UTC, no en el huso del navegador", () => {
    expect(diaSemanaISO(MIERCOLES)).toBe(3);
    expect(diaSemanaISO(SABADO)).toBe(6);
  });

  it("reconoce los días que el consultorio no atiende", () => {
    expect(esDiaDeAtencion(config(), MIERCOLES)).toBe(true);
    expect(esDiaDeAtencion(config(), SABADO)).toBe(false);
  });

  it("trata la lista vacía de días como «sin restricción»", () => {
    expect(esDiaDeAtencion(config({ diasAtencion: [] }), SABADO)).toBe(true);
  });

  it("salta al próximo día de atención", () => {
    expect(proximoDiaDeAtencion(config(), SABADO)).toBe("2026-07-06"); // lunes
    expect(proximoDiaDeAtencion(config(), MIERCOLES)).toBe(MIERCOLES);
  });

  it("apaga la franja que no termina antes de cerrar", () => {
    const franjas = franjasDelDia(base);
    expect(franjas.map((f) => f.hora)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
    // 11:00 + 30 min se pasa del cierre; 10:30 termina justo y sí entra.
    expect(franjas.at(-1)).toMatchObject({
      hora: "11:00",
      disponible: false,
      motivo: "cierra",
    });
    expect(franjas.at(-2)).toMatchObject({ hora: "10:30", disponible: true });
  });

  it("apaga una franja más cuando la consulta dura más", () => {
    const franjas = franjasDelDia({ ...base, duracionMinutos: 60 });
    expect(franjas.at(-2)).toMatchObject({
      hora: "10:30",
      disponible: false,
      motivo: "cierra",
    });
    expect(franjas.at(-3)).toMatchObject({ hora: "10:00", disponible: true });
  });

  it("apaga las franjas que pisan un turno ya agendado", () => {
    const franjas = franjasDelDia({
      ...base,
      duracionMinutos: 30,
      ocupados: [
        {
          id: "tur-1",
          fecha: new Date(`${MIERCOLES}T00:00:00Z`),
          hora: "09:15",
          duracionMinutos: 30,
          estado: "CONFIRMADO",
        },
      ],
    });
    // El turno ocupa 09:15–09:45: choca con el de 09:00 y con el de 09:30.
    expect(franjas[0]).toMatchObject({
      hora: "09:00",
      disponible: false,
      motivo: "ocupado",
    });
    expect(franjas[1]).toMatchObject({
      hora: "09:30",
      disponible: false,
      motivo: "ocupado",
    });
    expect(franjas[2]).toMatchObject({ hora: "10:00", disponible: true });
  });

  it("un turno cancelado libera el horario", () => {
    const franjas = franjasDelDia({
      ...base,
      ocupados: [
        {
          id: "tur-1",
          fecha: new Date(`${MIERCOLES}T00:00:00Z`),
          hora: "09:00",
          duracionMinutos: 30,
          estado: "CANCELADO",
        },
      ],
    });
    expect(franjas[0]).toMatchObject({ hora: "09:00", disponible: true });
  });

  it("el turno que se está reprogramando no choca consigo mismo", () => {
    const propio = {
      id: "tur-1",
      fecha: new Date(`${MIERCOLES}T00:00:00Z`),
      hora: "09:00",
      duracionMinutos: 30,
      estado: "CONFIRMADO" as const,
    };
    const franjas = franjasDelDia({
      ...base,
      ocupados: [propio],
      excluirTurnoId: "tur-1",
    });
    expect(franjas[0]).toMatchObject({ hora: "09:00", disponible: true });
  });

  it("ignora los turnos de otra fecha", () => {
    const franjas = franjasDelDia({
      ...base,
      ocupados: [
        {
          id: "tur-1",
          fecha: new Date("2026-07-02T00:00:00Z"),
          hora: "09:00",
          duracionMinutos: 30,
          estado: "CONFIRMADO",
        },
      ],
    });
    expect(franjas[0]).toMatchObject({ hora: "09:00", disponible: true });
  });

  it("apaga las horas que ya pasaron, solo si la fecha es hoy", () => {
    const franjas = franjasDelDia({
      ...base,
      hoyISO: MIERCOLES,
      ahoraHHmm: "09:30",
    });
    expect(franjas[0]).toMatchObject({
      hora: "09:00",
      disponible: false,
      motivo: "pasado",
    });
    expect(franjas[1]).toMatchObject({
      hora: "09:30",
      disponible: false,
      motivo: "pasado",
    });
    expect(franjas[2]).toMatchObject({ hora: "10:00", disponible: true });
  });
});

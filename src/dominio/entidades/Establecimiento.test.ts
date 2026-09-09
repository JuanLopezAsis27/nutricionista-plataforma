import { describe, it, expect } from "vitest";
import { Establecimiento } from "./Establecimiento";
import { ErrorValidacion } from "../errores/ErrorValidacion";

const ahora = new Date("2026-07-14T12:00:00Z");

function sede(
  cambios: Partial<Parameters<typeof Establecimiento.crear>[0]> = {},
): Establecimiento {
  return Establecimiento.crear(
    { nombre: "Consultorio centro", ...cambios },
    "est-1",
    ahora,
  );
}

describe("Establecimiento", () => {
  it("nace vigente, sin restricción de agenda y sin ser el principal", () => {
    const e = sede();

    expect(e.estaArchivado).toBe(false);
    expect(e.esPrincipal).toBe(false);
    // Sin días ni horario: una sede recién dada de alta tiene que poder
    // recibir turnos antes de que nadie le configure la agenda.
    expect(e.diasAtencion).toEqual([]);
    expect(e.atiendeEl(new Date("2026-07-05"))).toBe(true); // domingo
    expect(e.admiteHorario("23:30", 30)).toBe(true);
  });

  it("recorta espacios del nombre y lo exige no vacío", () => {
    expect(sede({ nombre: "  Barrio  " }).nombre).toBe("Barrio");
    expect(() => sede({ nombre: "   " })).toThrow(ErrorValidacion);
  });

  it("rechaza un horario invertido y una hora mal formada", () => {
    expect(() =>
      sede({ atencionHoraDesde: "18:00", atencionHoraHasta: "09:00" }),
    ).toThrow(ErrorValidacion);
    expect(() => sede({ atencionHoraDesde: "25:00" })).toThrow(ErrorValidacion);
  });

  it("rechaza días fuera de 0..6 y colores que no son hexadecimales", () => {
    expect(() => sede({ diasAtencion: [1, 7] })).toThrow(ErrorValidacion);
    expect(() => sede({ color: "rojo" })).toThrow(ErrorValidacion);
    expect(sede({ color: "#F4535E" }).color).toBe("#F4535E");
  });

  describe("atiendeEl", () => {
    it("lee el día de la semana en UTC", () => {
      // 2026-07-01 es miércoles. Con getDay() en una zona al oeste de
      // Greenwich se leería como martes y el turno quedaría rechazado.
      const e = sede({ diasAtencion: [3] });

      expect(e.atiendeEl(new Date("2026-07-01"))).toBe(true);
      expect(e.atiendeEl(new Date("2026-07-02"))).toBe(false);
    });

    it("la lista vacía es «sin restricción», no «no atiende nunca»", () => {
      const e = sede({ diasAtencion: [] });

      expect(e.atiendeEl(new Date("2026-07-05"))).toBe(true);
    });
  });

  describe("admiteHorario", () => {
    it("mira el fin del turno, no solo el inicio", () => {
      const e = sede({
        atencionHoraDesde: "09:00",
        atencionHoraHasta: "10:30",
      });

      expect(e.admiteHorario("10:00", 30)).toBe(true); // termina justo al cierre
      expect(e.admiteHorario("10:15", 30)).toBe(false); // se pasa 15 minutos
      expect(e.admiteHorario("08:45", 30)).toBe(false); // arranca antes de abrir
    });
  });

  describe("archivar", () => {
    it("marca la fecha y deja de ser el principal", () => {
      const e = sede().marcarPrincipal(true, ahora).archivar(ahora);

      expect(e.estaArchivado).toBe(true);
      expect(e.archivadoEn).toEqual(ahora);
      // El fallback de "sin sede elegida" no puede apuntar a un lugar cerrado.
      expect(e.esPrincipal).toBe(false);
    });

    it("es idempotente: archivar dos veces no mueve la fecha", () => {
      const primera = sede().archivar(ahora);
      const segunda = primera.archivar(new Date("2026-08-01T12:00:00Z"));

      expect(segunda.archivadoEn).toEqual(ahora);
    });

    it("restaurar la vuelve a dejar vigente", () => {
      expect(sede().archivar(ahora).restaurar(ahora).estaArchivado).toBe(false);
    });
  });

  it("una sede archivada no puede marcarse como principal", () => {
    const cerrada = sede().archivar(ahora);

    expect(() => cerrada.marcarPrincipal(true, ahora)).toThrow(ErrorValidacion);
  });

  it("actualizar valida los cambios y conserva id y fecha de alta", () => {
    const e = sede().actualizar({ nombre: "Otro nombre" }, ahora);

    expect(e.id).toBe("est-1");
    expect(e.nombre).toBe("Otro nombre");
    expect(() => e.actualizar({ turnoDuracionMinutos: 0 })).toThrow(
      ErrorValidacion,
    );
  });
});

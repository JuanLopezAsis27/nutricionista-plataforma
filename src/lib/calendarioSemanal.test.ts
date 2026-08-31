import { describe, it, expect } from "vitest";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import {
  sumarDias,
  ventanaDeDias,
  rangoHorarioVisible,
  repartirCarriles,
} from "./calendarioSemanal";

function turno(
  hora: string,
  duracionMinutos: number,
  id = hora,
): TurnoSalidaDto {
  return {
    id,
    pacienteId: "p1",
    fecha: new Date("2026-07-01T00:00:00Z"),
    hora,
    duracionMinutos,
    estado: "CONFIRMADO",
    notas: null,
    precio: null,
    pagado: false,
    creadoEn: new Date("2026-06-01T00:00:00Z"),
  };
}

const horario = { atencionHoraDesde: "09:00", atencionHoraHasta: "17:00" };

describe("calendarioSemanal", () => {
  describe("ventana de días", () => {
    it("avanza en UTC y cruza el fin de mes", () => {
      expect(sumarDias("2026-07-31", 1)).toBe("2026-08-01");
      expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    });

    it("arranca en el ancla y devuelve días consecutivos", () => {
      expect(ventanaDeDias("2026-08-30", 7)).toEqual([
        "2026-08-30",
        "2026-08-31",
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-05",
      ]);
    });
  });

  describe("rango horario visible", () => {
    it("sin turnos, es el horario de atención", () => {
      expect(rangoHorarioVisible(horario, [])).toEqual({
        desdeMinutos: 9 * 60,
        hastaMinutos: 17 * 60,
      });
    });

    it("se estira para que un turno fuera de horario no desaparezca", () => {
      // Un turno a las 07:40 y otro que termina 17:30: la grilla los tiene que
      // mostrar aunque el consultorio hoy atienda 09–17.
      const { desdeMinutos, hastaMinutos } = rangoHorarioVisible(horario, [
        turno("07:40", 30, "a"),
        turno("16:45", 45, "b"),
      ]);
      expect(desdeMinutos).toBe(7 * 60);
      expect(hastaMinutos).toBe(18 * 60);
    });

    it("nunca deja la grilla de alto cero", () => {
      const invertido = {
        atencionHoraDesde: "10:00",
        atencionHoraHasta: "10:00",
      };
      const { desdeMinutos, hastaMinutos } = rangoHorarioVisible(invertido, []);
      expect(hastaMinutos - desdeMinutos).toBeGreaterThanOrEqual(60);
    });
  });

  describe("reparto de carriles", () => {
    it("deja en un solo carril los turnos que no se pisan", () => {
      const bloques = repartirCarriles([
        turno("09:00", 30),
        turno("10:00", 30),
      ]);
      expect(bloques.map((b) => [b.carril, b.carriles])).toEqual([
        [0, 1],
        [0, 1],
      ]);
    });

    it("reparte en dos carriles los que se solapan", () => {
      const bloques = repartirCarriles([
        turno("09:00", 60),
        turno("09:30", 30),
      ]);
      expect(bloques.map((b) => [b.carril, b.carriles])).toEqual([
        [0, 2],
        [1, 2],
      ]);
    });

    it("un turno que arranca justo cuando termina el anterior no se solapa", () => {
      const bloques = repartirCarriles([
        turno("09:00", 30),
        turno("09:30", 30),
      ]);
      expect(bloques.every((b) => b.carriles === 1)).toBe(true);
    });

    it("reutiliza el carril que dejó libre un turno ya terminado", () => {
      // 09:00–10:00 abraza a los dos cortos: estos comparten el segundo carril
      // en vez de abrir uno nuevo cada uno.
      const bloques = repartirCarriles([
        turno("09:00", 60, "largo"),
        turno("09:00", 20, "corto1"),
        turno("09:30", 20, "corto2"),
      ]);
      const porId = new Map(bloques.map((b) => [b.turno.id, b]));
      expect(porId.get("largo")!.carril).toBe(0);
      expect(porId.get("corto1")!.carril).toBe(1);
      expect(porId.get("corto2")!.carril).toBe(1);
      expect(bloques.every((b) => b.carriles === 2)).toBe(true);
    });

    it("el ancho lo fija el momento más poblado de todo el grupo", () => {
      // El de las 09:40 no se pisa con el de las 09:00, pero los tres están
      // encadenados por el largo: si el grupo no se resolviera entero, los dos
      // primeros se dibujarían al doble de ancho que el tercero.
      const bloques = repartirCarriles([
        turno("09:00", 120, "largo"),
        turno("09:00", 30, "a"),
        turno("09:40", 30, "b"),
        turno("09:45", 30, "c"),
      ]);
      expect(bloques.every((b) => b.carriles === 3)).toBe(true);
    });

    it("calcula el fin sumando la duración al inicio", () => {
      const [bloque] = repartirCarriles([turno("14:15", 45)]);
      expect(bloque!.inicioMinutos).toBe(14 * 60 + 15);
      expect(bloque!.finMinutos).toBe(15 * 60);
    });
  });
});

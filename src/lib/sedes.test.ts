import { describe, it, expect } from "vitest";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import { agendaUnificada, coloresDeSedes, sedePorDiaDeLaSemana } from "./sedes";

function sede(
  cambios: Partial<EstablecimientoSalidaDto> = {},
): EstablecimientoSalidaDto {
  return {
    id: "est-1",
    nombre: "Centro",
    direccion: null,
    telefono: null,
    color: null,
    orden: 0,
    esPrincipal: false,
    turnoDuracionMinutos: 30,
    turnoPasoMinutos: 30,
    atencionHoraDesde: "09:00",
    atencionHoraHasta: "13:00",
    diasAtencion: [1, 3],
    archivadoEn: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    ...cambios,
  };
}

describe("coloresDeSedes", () => {
  it("respeta el color elegido y completa los que faltan", () => {
    const colores = coloresDeSedes([
      sede({ id: "a", color: "#123456" }),
      sede({ id: "b" }),
    ]);

    expect(colores.get("a")).toBe("#123456");
    expect(colores.get("b")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("asigna por posición, así el color de una sede no cambia entre recargas", () => {
    const lista = [sede({ id: "a" }), sede({ id: "b" }), sede({ id: "c" })];

    expect(coloresDeSedes(lista)).toEqual(coloresDeSedes([...lista]));
  });
});

describe("agendaUnificada", () => {
  it("une los días: el sábado de una sede no se pinta cerrado por la otra", () => {
    const agenda = agendaUnificada([
      sede({ id: "a", diasAtencion: [1, 3] }),
      sede({ id: "b", diasAtencion: [2, 6] }),
    ]);

    expect(agenda.diasAtencion).toEqual([1, 2, 3, 6]);
  });

  it("una sede sin restricción de días deja la unión sin restricción", () => {
    const agenda = agendaUnificada([
      sede({ id: "a", diasAtencion: [1] }),
      sede({ id: "b", diasAtencion: [] }),
    ]);

    expect(agenda.diasAtencion).toEqual([]);
  });

  it("abre la ventana horaria de la más temprana a la más tardía", () => {
    // Recortarla al horario de una escondería los turnos de la otra, que es la
    // peor forma de perder un turno.
    const agenda = agendaUnificada([
      sede({ id: "a", atencionHoraDesde: "09:00", atencionHoraHasta: "13:00" }),
      sede({ id: "b", atencionHoraDesde: "15:00", atencionHoraHasta: "20:00" }),
    ]);

    expect(agenda.atencionHoraDesde).toBe("09:00");
    expect(agenda.atencionHoraHasta).toBe("20:00");
  });

  it("una sede sin horario declarado deja la ventana sin acotar", () => {
    const agenda = agendaUnificada([
      sede({ id: "a", atencionHoraDesde: "09:00", atencionHoraHasta: "13:00" }),
      sede({ id: "b", atencionHoraDesde: null, atencionHoraHasta: null }),
    ]);

    expect(agenda.atencionHoraDesde).toBeNull();
    expect(agenda.atencionHoraHasta).toBeNull();
  });

  it("toma el paso y la duración más chicos, para no saltear franjas", () => {
    const agenda = agendaUnificada([
      sede({ id: "a", turnoPasoMinutos: 30, turnoDuracionMinutos: 45 }),
      sede({ id: "b", turnoPasoMinutos: 15, turnoDuracionMinutos: 30 }),
    ]);

    expect(agenda.turnoPasoMinutos).toBe(15);
    expect(agenda.turnoDuracionMinutos).toBe(30);
  });

  it("sin sedes devuelve una agenda sin restricciones", () => {
    // La pantalla tiene que poder dibujarse igual mientras no haya ninguna.
    const agenda = agendaUnificada([]);

    expect(agenda.diasAtencion).toEqual([]);
    expect(agenda.atencionHoraDesde).toBeNull();
    expect(agenda.turnoPasoMinutos).toBeGreaterThan(0);
  });

  it("con una sola sede devuelve su propia agenda", () => {
    const unica = sede({ diasAtencion: [2], atencionHoraDesde: "10:00" });
    const agenda = agendaUnificada([unica]);

    expect(agenda.diasAtencion).toEqual([2]);
    expect(agenda.atencionHoraDesde).toBe("10:00");
    expect(agenda.atencionHoraHasta).toBe(unica.atencionHoraHasta);
  });
});

describe("sedePorDiaDeLaSemana", () => {
  // Las tres condiciones que habilitan agendar clickeando en la vista
  // unificada. La que hace el trabajo es la tercera: si los días no se pisan,
  // "martes" ya dice en qué consultorio, y no queda nada que preguntar.
  const centro = sede({
    id: "centro",
    nombre: "Centro",
    diasAtencion: [1, 3],
    atencionHoraDesde: "09:00",
    atencionHoraHasta: "13:00",
    turnoDuracionMinutos: 30,
  });
  const barrio = sede({
    id: "barrio",
    nombre: "Barrio",
    diasAtencion: [2, 4],
    atencionHoraDesde: "09:00",
    atencionHoraHasta: "13:00",
    turnoDuracionMinutos: 30,
  });

  it("resuelve el dueño de cada día cuando se cumplen las tres condiciones", () => {
    const mapa = sedePorDiaDeLaSemana([centro, barrio]);

    expect(mapa?.get(1)?.id).toBe("centro");
    expect(mapa?.get(2)?.id).toBe("barrio");
    expect(mapa?.get(3)?.id).toBe("centro");
    expect(mapa?.get(4)?.id).toBe("barrio");
    // Un día que nadie atiende no tiene dueño: tampoco tiene huecos.
    expect(mapa?.get(6)).toBeUndefined();
  });

  it("no resuelve si dos sedes comparten un día", () => {
    // El miércoles sería de las dos: el hueco no diría en cuál se agenda.
    const compartido = sede({ id: "barrio", diasAtencion: [2, 3] });

    expect(sedePorDiaDeLaSemana([centro, compartido])).toBeNull();
  });

  it("no resuelve si los horarios de atención difieren", () => {
    // Un hueco de las 15:00 sería válido en una sede y tarde en la otra.
    const tarde = { ...barrio, atencionHoraHasta: "20:00" };

    expect(sedePorDiaDeLaSemana([centro, tarde])).toBeNull();
  });

  it("no resuelve si la duración del turno difiere", () => {
    // Es la que decide el alto del bloque y si el turno entra antes de cerrar.
    const largos = { ...barrio, turnoDuracionMinutos: 45 };

    expect(sedePorDiaDeLaSemana([centro, largos])).toBeNull();
  });

  it("una sede sin días declarados atiende todos, así que se pisa con todas", () => {
    const siempre = sede({ id: "barrio", diasAtencion: [] });

    expect(sedePorDiaDeLaSemana([centro, siempre])).toBeNull();
  });

  it("el paso puede diferir: cada día usa la agenda de su dueña", () => {
    const otroPaso = { ...barrio, turnoPasoMinutos: 15 };
    const mapa = sedePorDiaDeLaSemana([centro, otroPaso]);

    expect(mapa?.get(2)?.turnoPasoMinutos).toBe(15);
    expect(mapa?.get(1)?.turnoPasoMinutos).toBe(30);
  });

  it("con una sola sede resuelve sus propios días", () => {
    const mapa = sedePorDiaDeLaSemana([centro]);

    expect(mapa?.get(1)?.id).toBe("centro");
    expect(mapa?.get(2)).toBeUndefined();
  });

  it("sin sedes no resuelve nada", () => {
    expect(sedePorDiaDeLaSemana([])).toBeNull();
  });
});

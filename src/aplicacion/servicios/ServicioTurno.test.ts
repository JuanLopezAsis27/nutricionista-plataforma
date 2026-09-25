import { describe, it, expect, vi } from "vitest";
import { ServicioTurno } from "./ServicioTurno";
import type { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import type { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import type { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import type { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import type { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import type { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import type { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import type { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
import type { CancelarTurnoPorPaciente } from "@/aplicacion/casos-de-uso/turnos/CancelarTurnoPorPaciente";
import type { ConfirmarAsistenciaTurno } from "@/aplicacion/casos-de-uso/turnos/ConfirmarAsistenciaTurno";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  mockEstablecimientoRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  turnoEjemplo,
} from "@/aplicacion/casos-de-uso/_ayudas-test";

/**
 * El nombre del paciente de cada turno lo resuelve el SERVICIO, por id.
 *
 * Este test existe por lo que pasaba cuando no era así: cada pantalla armaba
 * un mapa con la primera página del listado de pacientes (100, solo vigentes),
 * y un turno del paciente 101 —o de uno archivado— salía como "Paciente",
 * aunque el enlace llevara a la ficha correcta. En producción se notaba recién
 * cuando el consultorio pasaba los cien pacientes.
 *
 * Lo que se fija es el CÓMO, porque es lo que se rompe: una sola consulta, por
 * los ids de los turnos, y nunca un `listar` —que filtra archivados y pagina—.
 * Que el repositorio incluya a los archivados en `obtenerPorIds` es contrato
 * del puerto; acá no se prueba Prisma.
 *
 * Los casos de uso se doblan con `as unknown as`: el doble solo necesita
 * `ejecutar`.
 */

function doble<T>(ejecutar: ReturnType<typeof vi.fn>): T {
  return { ejecutar } as unknown as T;
}

function armar(
  pacientes: IPacienteRepositorio,
  casos: {
    obtenerTodos?: ReturnType<typeof vi.fn>;
    agendar?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const noUsado = vi.fn();
  return new ServicioTurno(
    doble<AgendarTurno>(casos.agendar ?? noUsado),
    doble<ObtenerTurnos>(casos.obtenerTodos ?? noUsado),
    doble<ObtenerTurnosPorPaciente>(noUsado),
    doble<ActualizarEstadoTurno>(noUsado),
    doble<CancelarTurno>(noUsado),
    doble<ReprogramarTurno>(noUsado),
    doble<RegistrarCobroTurno>(noUsado),
    doble<EliminarTurno>(noUsado),
    doble<ConfirmarAsistenciaTurno>(noUsado),
    {
      alAgendar: vi.fn(async () => {}),
      alReprogramar: vi.fn(async () => {}),
      alCancelar: vi.fn(async () => {}),
    } satisfies ISincronizadorCalendario,
    mockEstablecimientoRepositorio(),
    pacientes,
    doble<CancelarTurnoPorPaciente>(noUsado),
  );
}

describe("ServicioTurno — nombre del paciente", () => {
  it("resuelve los nombres de un listado en UNA consulta por id, sin listar", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorIds: vi.fn(async () => [
        pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-1"),
        pacienteEjemplo({ nombre: "Luis", apellido: "Pérez" }, "pac-2"),
      ]),
    });
    const servicio = armar(pacientes, {
      obtenerTodos: vi.fn(async () => [
        turnoEjemplo({ pacienteId: "pac-1" }, "tur-1"),
        turnoEjemplo({ pacienteId: "pac-2" }, "tur-2"),
        // Mismo paciente dos veces: se pide una sola vez.
        turnoEjemplo({ pacienteId: "pac-1" }, "tur-3"),
      ]),
    });

    const turnos = await servicio.obtenerTurnos({});

    expect(turnos.map((t) => t.pacienteNombre)).toEqual([
      "Ana García",
      "Luis Pérez",
      "Ana García",
    ]);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledOnce();
    expect(pacientes.obtenerPorIds).toHaveBeenCalledWith(["pac-1", "pac-2"]);
    // El listado pagina y deja afuera a los archivados: es exactamente el
    // camino que producía el "Paciente".
    expect(pacientes.listar).not.toHaveBeenCalled();
  });

  it("un turno suelto resuelve su paciente por id", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-1"),
      ),
    });
    const servicio = armar(pacientes, {
      agendar: vi.fn(async () => turnoEjemplo({ pacienteId: "pac-1" })),
    });

    const turno = await servicio.agendarTurno({
      pacienteId: "pac-1",
      establecimientoId: "est-1",
      fecha: new Date("2026-09-21"),
      hora: "10:00",
    } as Parameters<ServicioTurno["agendarTurno"]>[0]);

    expect(turno.pacienteNombre).toBe("Ana García");
    expect(pacientes.obtenerPorId).toHaveBeenCalledWith("pac-1");
  });

  it("sin turnos no consulta pacientes", async () => {
    const pacientes = mockPacienteRepositorio();
    const servicio = armar(pacientes, { obtenerTodos: vi.fn(async () => []) });

    expect(await servicio.obtenerTurnos({})).toEqual([]);
    expect(pacientes.obtenerPorIds).not.toHaveBeenCalled();
  });
});

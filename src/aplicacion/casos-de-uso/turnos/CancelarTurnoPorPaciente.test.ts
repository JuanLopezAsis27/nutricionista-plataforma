import { describe, it, expect, vi } from "vitest";
import { CancelarTurnoPorPaciente } from "./CancelarTurnoPorPaciente";
import { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import type { Notificacion } from "@/dominio/entidades/Notificacion";
import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockServicioEmail,
  mockBusEventos,
  mockNotificacionRepositorio,
  mockReloj,
  turnoEjemplo,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

function armar(turno: Turno | null) {
  const actualizar = vi.fn(async (t: Turno) => t);
  const publicar = vi.fn(async () => {});
  const enviar = vi.fn(async () => {});
  const notificaciones = mockNotificacionRepositorio();
  const uc = new CancelarTurnoPorPaciente(
    mockTurnoRepositorio({
      obtenerPorId: vi.fn(async () => turno),
      actualizar,
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    }),
    mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioEjemplo()]),
    }),
    mockServicioEmail({ enviar }),
    mockBusEventos({ publicar }),
    new EmitirNotificacion(notificaciones, mockReloj(AHORA)),
    mockReloj(AHORA),
  );
  return { uc, actualizar, enviar, publicar, notificaciones };
}

describe("CancelarTurnoPorPaciente", () => {
  it("cancela el turno, registra cuándo y que fue el paciente, y avisa", async () => {
    const turno = turnoEjemplo({
      fecha: new Date("2026-07-15"),
      hora: "10:00",
    });
    const { uc, actualizar, enviar, publicar, notificaciones } = armar(turno);

    const resultado = await uc.ejecutar("tur-1");

    expect(resultado).toEqual({
      fecha: "15/07/2026",
      hora: "10:00",
      canceladoEn: AHORA,
      yaEstabaCancelado: false,
    });
    expect(turno.estado).toBe("CANCELADO");
    expect(turno.canceladoEn).toEqual(AHORA);
    expect(turno.canceladoPor).toBe("PACIENTE");
    expect(actualizar).toHaveBeenCalledWith(turno);
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        asunto: "Ana García canceló su turno del 15/07/2026",
      }),
    );
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "turno.cancelado" }),
    );
    const guardada = vi.mocked(notificaciones.crear).mock
      .calls[0]?.[0] as Notificacion;
    expect(guardada.aPrimitivos().tipo).toBe("TURNO_CANCELADO");
  });

  it("también cancela un turno que el paciente ya había confirmado", async () => {
    const turno = turnoEjemplo();
    turno.cambiarEstado("CONFIRMADO");
    const { uc } = armar(turno);

    await uc.ejecutar("tur-1");

    expect(turno.estado).toBe("CANCELADO");
  });

  it("abrir el enlace otra vez no vuelve a avisar", async () => {
    const turno = turnoEjemplo();
    turno.cancelarPorElPaciente(new Date("2026-07-13T09:00:00Z"));
    const { uc, actualizar, enviar } = armar(turno);

    const resultado = await uc.ejecutar("tur-1");

    expect(resultado.yaEstabaCancelado).toBe(true);
    expect(resultado.canceladoEn).toEqual(new Date("2026-07-13T09:00:00Z"));
    expect(actualizar).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("no cancela un turno ya completado", async () => {
    const turno = turnoEjemplo();
    turno.cambiarEstado("CONFIRMADO");
    turno.cambiarEstado("COMPLETADO");
    const { uc } = armar(turno);

    await expect(uc.ejecutar("tur-1")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("falla si el turno no existe", async () => {
    const { uc } = armar(null);
    await expect(uc.ejecutar("tur-x")).rejects.toBeInstanceOf(
      ErrorTurnoNoEncontrado,
    );
  });
});

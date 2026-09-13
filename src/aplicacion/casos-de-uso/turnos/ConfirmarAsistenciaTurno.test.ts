import { describe, it, expect, vi } from "vitest";
import { ConfirmarAsistenciaTurno } from "./ConfirmarAsistenciaTurno";
import { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import type { Notificacion } from "@/dominio/entidades/Notificacion";
import type { Turno } from "@/dominio/entidades/Turno";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
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

function armar(
  turno: Turno | null,
  enviar: IServicioEmail["enviar"] = vi.fn(async () => {}),
) {
  const actualizar = vi.fn(async (t: Turno) => t);
  const publicar = vi.fn(async () => {});
  const notificaciones = mockNotificacionRepositorio();
  const uc = new ConfirmarAsistenciaTurno(
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
    new EmitirNotificacion(notificaciones, mockReloj()),
  );
  return { uc, actualizar, enviar, publicar, notificaciones };
}

describe("ConfirmarAsistenciaTurno", () => {
  it("confirma un turno pendiente y le avisa al nutricionista", async () => {
    const turno = turnoEjemplo({
      fecha: new Date("2026-07-15"),
      hora: "10:00",
    });
    const { uc, actualizar, enviar, publicar } = armar(turno);

    const resultado = await uc.ejecutar("tur-1");

    expect(resultado).toEqual({
      fecha: "15/07/2026",
      hora: "10:00",
      yaEstabaConfirmado: false,
    });
    expect(turno.estado).toBe("CONFIRMADO");
    expect(actualizar).toHaveBeenCalledWith(turno);
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "nutri@mail.com",
        asunto: "Ana García confirmó su turno del 15/07/2026",
      }),
    );
    expect(publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "turno.confirmado", usuarioId: "usr-1" }),
    );
  });

  it("abrir el enlace de nuevo no vuelve a avisar", async () => {
    const turno = turnoEjemplo();
    turno.cambiarEstado("CONFIRMADO");
    const { uc, actualizar, enviar } = armar(turno);

    const resultado = await uc.ejecutar("tur-1");

    expect(resultado.yaEstabaConfirmado).toBe(true);
    expect(actualizar).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("no confirma un turno cancelado", async () => {
    const turno = turnoEjemplo();
    turno.cancelar();
    const { uc, actualizar } = armar(turno);

    await expect(uc.ejecutar("tur-1")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("lanza ErrorTurnoNoEncontrado si el turno ya no existe", async () => {
    const { uc } = armar(null);

    await expect(uc.ejecutar("tur-x")).rejects.toBeInstanceOf(
      ErrorTurnoNoEncontrado,
    );
  });

  it("si el email al nutricionista falla, la confirmación igual queda guardada", async () => {
    const turno = turnoEjemplo();
    const { uc, actualizar } = armar(
      turno,
      vi.fn(async () => {
        throw new Error("smtp caído");
      }),
    );
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(uc.ejecutar("tur-1")).resolves.toMatchObject({
      yaEstabaConfirmado: false,
    });
    expect(actualizar).toHaveBeenCalledWith(turno);
    consola.mockRestore();
  });
});

describe("ConfirmarAsistenciaTurno — notificación", () => {
  it("deja una notificación persistida al confirmar", async () => {
    // Hasta acá la confirmación se contaba solo por email y por el bus, y los
    // dos son efímeros: el mail se pierde entre otros cincuenta y el evento
    // solo llega a quien tenga la app abierta en ese momento.
    const { uc, notificaciones } = armar(
      turnoEjemplo({ fecha: new Date("2026-07-15"), hora: "10:00" }),
    );

    await uc.ejecutar("tur-1");

    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
    const [creada] = (notificaciones.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Notificacion];
    expect(creada.tipo).toBe("TURNO_CONFIRMADO");
    expect(creada.detalle).toContain("10:00");
    // Nace sin ver: es lo que la hace contar en el globo de la campana.
    expect(creada.vistoEn).toBeNull();
  });

  it("abrir el enlace de nuevo no vuelve a notificar", async () => {
    // Mismo criterio que el resto del aviso: el turno ya estaba confirmado, no
    // pasó nada nuevo que contarle al profesional.
    const turno = turnoEjemplo();
    turno.cambiarEstado("CONFIRMADO");
    const { uc, notificaciones } = armar(turno);

    await uc.ejecutar("tur-1");

    expect(notificaciones.crear).not.toHaveBeenCalled();
  });
});

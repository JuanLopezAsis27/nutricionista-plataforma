import { describe, it, expect, vi } from "vitest";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";
import { ErrorPlantillaNoEncontrada } from "@/dominio/errores/ErrorPlantillaNoEncontrada";
import {
  mockPlantillaEmailRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  mockEmailEnviadoRepositorio,
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockServicioEmail,
  mockReloj,
  plantillaEmailEjemplo,
  turnoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const PROFESIONAL = "Lic. López Asis";
// El reloj de ejemplo marca hoy = 2026-07-14 (UTC); mañana = 2026-07-15.
const MANANA = new Date("2026-07-15");

function armar(overrides: {
  turnos?: ReturnType<typeof turnoEjemplo>[];
  paciente?: ReturnType<typeof pacienteEjemplo> | null;
  yaEnviado?: boolean;
}) {
  const plantilla = plantillaEmailEjemplo();
  const enviar = vi.fn(async () => {});
  const registrar = vi.fn(async () => {});

  const uc = new EnviarRecordatoriosPorEmail(
    mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantilla),
    }),
    mockEmailEnviadoRepositorio({
      yaEnviado: vi.fn(async () => overrides.yaEnviado ?? false),
      registrar,
    }),
    mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => overrides.turnos ?? []),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        overrides.paciente === undefined
          ? pacienteEjemplo()
          : overrides.paciente,
      ),
    }),
    mockServicioEmail({ enviar }),
    mockReloj(),
    mockConfiguracionRecordatoriosRepositorio(),
    PROFESIONAL,
  );
  return { uc, enviar, registrar };
}

describe("EnviarRecordatoriosPorEmail", () => {
  it("envía y registra el recordatorio de un turno confirmado de mañana", async () => {
    const turno = turnoEjemplo({ fecha: MANANA, hora: "10:00" });
    turno.cambiarEstado("CONFIRMADO");
    const { uc, enviar, registrar } = armar({ turnos: [turno] });

    const resultado = await uc.ejecutar();

    expect(resultado).toEqual({ enviados: 1, omitidos: 0, fallidos: 0 });
    expect(registrar).toHaveBeenCalledOnce();
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "ana@mail.com",
        html: expect.stringContaining("Ana García"),
        asunto: expect.stringContaining("15/07/2026"),
      }),
    );
  });

  it("es idempotente: omite un turno que ya tiene recordatorio", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const { uc, enviar } = armar({ turnos: [turno], yaEnviado: true });

    const resultado = await uc.ejecutar();

    expect(resultado.omitidos).toBe(1);
    expect(resultado.enviados).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("ignora turnos cancelados o completados", async () => {
    const cancelado = turnoEjemplo({ fecha: MANANA }, "tur-c");
    cancelado.cambiarEstado("CANCELADO");
    const { uc, enviar } = armar({ turnos: [cancelado] });

    const resultado = await uc.ejecutar();

    expect(resultado.enviados).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("cuenta como fallido un paciente sin email", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const { uc, registrar } = armar({ turnos: [turno], paciente: null });

    const resultado = await uc.ejecutar();

    expect(resultado.fallidos).toBe(1);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("no registra un envío que falla (se reintenta luego)", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const plantilla = plantillaEmailEjemplo();
    const registrar = vi.fn(async () => {});
    const uc = new EnviarRecordatoriosPorEmail(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () => plantilla),
      }),
      mockEmailEnviadoRepositorio({ registrar }),
      mockTurnoRepositorio({ obtenerEnFecha: vi.fn(async () => [turno]) }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      mockServicioEmail({
        enviar: vi.fn(async () => {
          throw new Error("smtp caído");
        }),
      }),
      mockReloj(),
      mockConfiguracionRecordatoriosRepositorio(),
      PROFESIONAL,
    );

    const resultado = await uc.ejecutar();

    expect(resultado.fallidos).toBe(1);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlantillaNoEncontrada si falta la plantilla del sistema", async () => {
    const uc = new EnviarRecordatoriosPorEmail(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () => null),
      }),
      mockEmailEnviadoRepositorio(),
      mockTurnoRepositorio(),
      mockPacienteRepositorio(),
      mockServicioEmail(),
      mockReloj(),
      mockConfiguracionRecordatoriosRepositorio(),
      PROFESIONAL,
    );

    await expect(uc.ejecutar()).rejects.toBeInstanceOf(
      ErrorPlantillaNoEncontrada,
    );
  });
});

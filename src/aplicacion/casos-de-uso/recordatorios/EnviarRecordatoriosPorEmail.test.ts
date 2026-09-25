import { describe, it, expect, vi } from "vitest";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";
import { ErrorPlantillaEmailRecordatorioNoEncontrada } from "@/dominio/errores/ErrorPlantillaEmailRecordatorioNoEncontrada";
import {
  mockPlantillaEmailRecordatorioRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  mockEmailEnviadoRepositorio,
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockEstablecimientoRepositorio,
  mockServicioEmail,
  mockEnlacesTurno,
  mockReloj,
  plantillaEmailRecordatorioEjemplo,
  turnoEjemplo,
  pacienteEjemplo,
  mockNutricionistaConNombre,
  mockConfiguracionRepositorio,
} from "../_ayudas-test";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";

const PROFESIONAL = "Lic. López Asis";
// El reloj de ejemplo marca hoy = 2026-07-14 (UTC); mañana = 2026-07-15.
const MANANA = new Date("2026-07-15");

function armar(overrides: {
  turnos?: ReturnType<typeof turnoEjemplo>[];
  paciente?: ReturnType<typeof pacienteEjemplo> | null;
  yaEnviado?: boolean;
  plantillaPorDia?: ReturnType<typeof plantillaEmailRecordatorioEjemplo> | null;
  predeterminada?: ReturnType<typeof plantillaEmailRecordatorioEjemplo>;
  /** Número de cancelaciones del consultorio; sin esto, no hay. */
  whatsappCancelaciones?: string;
}) {
  const predeterminada =
    overrides.predeterminada ?? plantillaEmailRecordatorioEjemplo();
  const enviar = vi.fn(async () => {});
  const registrar = vi.fn(async () => {});
  const enlaces = mockEnlacesTurno();

  const uc = new EnviarRecordatoriosPorEmail(
    mockPlantillaEmailRecordatorioRepositorio({
      obtenerPredeterminada: vi.fn(async () => predeterminada),
      obtenerPorDia: vi.fn(async () => overrides.plantillaPorDia ?? null),
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
    mockNutricionistaConNombre(PROFESIONAL),
    mockEstablecimientoRepositorio(),
    enlaces,
    mockConfiguracionRepositorio({
      obtener: vi.fn(async () =>
        ConfiguracionConsultorio.porDefecto().actualizar({
          whatsappCancelaciones: overrides.whatsappCancelaciones ?? null,
        }),
      ),
    }),
  );
  return { uc, enviar, registrar, enlaces, predeterminada };
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

  it("{{profesional}} es el nombre del consultorio (`nutricionistas.nombre`)", async () => {
    // La plantilla por defecto firma con {{profesional}}: antes salía de una
    // variable de entorno, igual para todos los consultorios.
    const turno = turnoEjemplo({ fecha: MANANA, hora: "10:00" });
    turno.cambiarEstado("CONFIRMADO");
    const { uc, enviar } = armar({ turnos: [turno] });

    await uc.ejecutar();

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining(PROFESIONAL) }),
    );
  });

  it("usa la plantilla propia del escalón cuando hay una asignada a ese día", async () => {
    const turno = turnoEjemplo({ fecha: MANANA, hora: "10:00" });
    const plantillaDelDia = plantillaEmailRecordatorioEjemplo(
      {
        asunto: "Mañana es tu turno, {{paciente}}",
        diasAntes: 1,
        predeterminada: false,
      },
      "pla-dia-1",
    );
    const { uc, enviar } = armar({
      turnos: [turno],
      plantillaPorDia: plantillaDelDia,
    });

    await uc.ejecutar();

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        asunto: expect.stringContaining("Mañana es tu turno"),
      }),
    );
  });

  it("agrega el botón para confirmar asistencia a un turno pendiente", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const { uc, enviar, enlaces } = armar({ turnos: [turno] });

    await uc.ejecutar();

    // El enlace vence al terminar el día del turno.
    expect(enlaces.generar).toHaveBeenCalledWith(
      "CONFIRMAR",
      turno.id,
      new Date("2026-07-16"),
    );
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'href="https://app.test/confirmar-turno?token=tur-1"',
        ),
      }),
    );
  });

  it("no agrega el botón si el turno ya está confirmado", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    turno.cambiarEstado("CONFIRMADO");
    const { uc, enviar, enlaces } = armar({ turnos: [turno] });

    await uc.ejecutar();

    expect(enlaces.generar).not.toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("confirmar-turno"),
      }),
    );
  });

  // La plantilla decide si pide confirmación, no el estado del turno solo:
  // un recordatorio puede ser puramente informativo.
  it("no agrega el botón si la plantilla lo tiene desactivado", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const sinBoton = plantillaEmailRecordatorioEjemplo({
      incluirBotonConfirmacion: false,
    });
    const { uc, enviar, enlaces } = armar({
      turnos: [turno],
      predeterminada: sinBoton,
    });

    await uc.ejecutar();

    expect(enlaces.generar).not.toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("confirmar-turno"),
      }),
    );
  });

  it("sin botón de cancelar por defecto: las plantillas viejas salen igual", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const { uc, enviar } = armar({ turnos: [turno] });

    await uc.ejecutar();

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("Cancelar turno"),
      }),
    );
  });

  it("cancelar por la app: un enlace firmado de CANCELAR, también en un turno confirmado", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    turno.cambiarEstado("CONFIRMADO");
    const { uc, enviar, enlaces } = armar({
      turnos: [turno],
      predeterminada: plantillaEmailRecordatorioEjemplo({
        botonCancelacion: "APP",
      }),
    });

    await uc.ejecutar();

    expect(enlaces.generar).toHaveBeenCalledWith(
      "CANCELAR",
      turno.id,
      new Date("2026-07-16"),
    );
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'href="https://app.test/cancelar-turno?token=tur-1"',
        ),
      }),
    );
  });

  it("cancelar por WhatsApp: abre el chat de cancelaciones con el mensaje del turno", async () => {
    const turno = turnoEjemplo({ fecha: MANANA, hora: "10:00" });
    const { uc, enviar } = armar({
      turnos: [turno],
      whatsappCancelaciones: "+54 9 11 5555-4444",
      predeterminada: plantillaEmailRecordatorioEjemplo({
        botonCancelacion: "WHATSAPP",
        mensajeCancelacion: "Cancelo el {{fecha}} a las {{hora}}",
      }),
    });

    await uc.ejecutar();

    const texto = encodeURIComponent("Cancelo el 15/07/2026 a las 10:00");
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          `href="https://wa.me/5491155554444?text=${texto}"`,
        ),
      }),
    );
  });

  it("cancelar por WhatsApp sin número cargado: el email sale igual, sin ese botón", async () => {
    const turno = turnoEjemplo({ fecha: MANANA });
    const { uc, enviar } = armar({
      turnos: [turno],
      predeterminada: plantillaEmailRecordatorioEjemplo({
        botonCancelacion: "WHATSAPP",
      }),
    });

    const resultado = await uc.ejecutar();

    expect(resultado.enviados).toBe(1);
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("wa.me"),
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
    const registrar = vi.fn(async () => {});
    const uc = new EnviarRecordatoriosPorEmail(
      mockPlantillaEmailRecordatorioRepositorio({
        obtenerPredeterminada: vi.fn(async () =>
          plantillaEmailRecordatorioEjemplo(),
        ),
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
      mockNutricionistaConNombre(PROFESIONAL),
      mockEstablecimientoRepositorio(),
      mockEnlacesTurno(),
      mockConfiguracionRepositorio(),
    );

    const resultado = await uc.ejecutar();

    expect(resultado.fallidos).toBe(1);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("lanza ErrorPlantillaEmailRecordatorioNoEncontrada si no hay predeterminada", async () => {
    const uc = new EnviarRecordatoriosPorEmail(
      mockPlantillaEmailRecordatorioRepositorio({
        obtenerPredeterminada: vi.fn(async () => null),
      }),
      mockEmailEnviadoRepositorio(),
      mockTurnoRepositorio(),
      mockPacienteRepositorio(),
      mockServicioEmail(),
      mockReloj(),
      mockConfiguracionRecordatoriosRepositorio(),
      mockNutricionistaConNombre(PROFESIONAL),
      mockEstablecimientoRepositorio(),
      mockEnlacesTurno(),
      mockConfiguracionRepositorio(),
    );

    await expect(uc.ejecutar()).rejects.toBeInstanceOf(
      ErrorPlantillaEmailRecordatorioNoEncontrada,
    );
  });
});

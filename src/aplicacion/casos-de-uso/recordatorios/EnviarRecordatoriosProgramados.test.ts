import { describe, it, expect, vi } from "vitest";
import { EnviarRecordatoriosProgramados } from "./EnviarRecordatoriosProgramados";
import { EnviarRecordatorioWhatsapp } from "./EnviarRecordatorioWhatsapp";
import { EnviarRecordatoriosPorEmail } from "./EnviarRecordatoriosPorEmail";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import {
  mockTurnoRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockPlantillaWhatsappRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  mockRecordatorioWhatsappRepositorio,
  mockProveedorWhatsapp,
  turnoEjemplo,
  pacienteEjemplo,
  plantillaWhatsappEjemplo,
  configuracionRecordatoriosEjemplo,
  mockPlantillaEmailRepositorio,
  mockEmailEnviadoRepositorio,
  mockServicioEmail,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

// El reloj de las ayudas fija "hoy"; acá interesa la hora, porque el barrido
// corre cada hora y decide por sí mismo si le toca.
const AHORA = new Date("2026-08-24T09:30:00");
const HOY = new Date("2026-08-24T00:00:00Z");
const DIA_MS = 24 * 60 * 60 * 1000;

function enDias(dias: number): Date {
  return new Date(HOY.getTime() + dias * DIA_MS);
}

function armar(
  opciones: {
    config?: ConfiguracionRecordatorios;
    turnos?: ReturnType<typeof turnoEjemplo>[];
    existentes?: Map<string, RecordatorioWhatsapp[]>;
    plantilla?: ReturnType<typeof plantillaWhatsappEjemplo> | null;
  } = {},
) {
  const enviarEmail = vi.fn(async () => {});
  const recordatorios = mockRecordatorioWhatsappRepositorio({
    porTurnos: vi.fn(async () => opciones.existentes ?? new Map()),
  });
  const proveedor = mockProveedorWhatsapp();
  const caso = new EnviarRecordatoriosProgramados(
    mockTurnoRepositorio({
      listarEntreFechas: vi.fn(async () => opciones.turnos ?? []),
    }),
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        pacienteEjemplo({ telefono: "011 15 5555-4444" }),
      ),
    }),
    mockConfiguracionRepositorio(),
    mockPlantillaWhatsappRepositorio({
      obtenerPredeterminada: vi.fn(async () =>
        opciones.plantilla === undefined
          ? plantillaWhatsappEjemplo()
          : opciones.plantilla,
      ),
    }),
    mockConfiguracionRecordatoriosRepositorio({
      obtener: vi.fn(
        async () =>
          opciones.config ??
          configuracionRecordatoriosEjemplo({
            whatsappAutomatico: true,
            whatsappDiasAntes: [3, 1],
            horaEnvio: "09:00",
          }),
      ),
    }),
    recordatorios,
    new EnviarRecordatorioWhatsapp(recordatorios, proveedor),
    new EnviarRecordatoriosPorEmail(
      mockPlantillaEmailRepositorio({
        obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo()),
      }),
      mockEmailEnviadoRepositorio(),
      mockTurnoRepositorio({
        obtenerEnFecha: vi.fn(async () => opciones.turnos ?? []),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () =>
          pacienteEjemplo({ telefono: "011 15 5555-4444" }),
        ),
      }),
      mockServicioEmail({ enviar: enviarEmail }),
      { ahora: () => AHORA, hoy: () => HOY },
      mockConfiguracionRecordatoriosRepositorio({
        obtener: vi.fn(
          async () =>
            opciones.config ??
            configuracionRecordatoriosEjemplo({
              whatsappAutomatico: true,
              whatsappDiasAntes: [3, 1],
              horaEnvio: "09:00",
            }),
        ),
      }),
      "Lic. Nutrición",
    ),
    { ahora: () => AHORA, hoy: () => HOY },
  );
  return { caso, recordatorios, proveedor, enviarEmail };
}

describe("EnviarRecordatoriosProgramados", () => {
  it("manda un aviso por cada escalón configurado", async () => {
    const { caso, recordatorios } = armar({
      turnos: [
        turnoEjemplo({ fecha: enDias(3) }, "tur-3"),
        turnoEjemplo({ fecha: enDias(1) }, "tur-1"),
      ],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.corrio).toBe(true);
    expect(resultado.whatsapp).toMatchObject({ enviados: 2, fallidos: 0 });
    const escalones = vi
      .mocked(recordatorios.registrar)
      .mock.calls.map(([r]) => r.aPrimitivos().diasAntes);
    expect(escalones.sort()).toEqual([1, 3]);
  });

  // Un turno dentro de la ventana pero en otro día no le corresponde a ningún
  // escalón: avisarle "3 días antes" a dos días del turno sería mentirle.
  it("ignora los turnos que no caen exactamente en un escalón", async () => {
    const { caso, recordatorios } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(2) }, "tur-2")],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.whatsapp.enviados).toBe(0);
    expect(recordatorios.registrar).not.toHaveBeenCalled();
  });

  // La protección pedida contra el doble envío. La garantía dura la da el
  // índice único; acá se comprueba que ni siquiera se intente.
  it("no reenvía un escalón que ya salió", async () => {
    const turno = turnoEjemplo({ fecha: enDias(1) }, "tur-1");
    const yaEnviado = RecordatorioWhatsapp.crear(
      {
        turnoId: "tur-1",
        pacienteId: "pac-1",
        telefono: "5491155554444",
        mensaje: "Ya salió",
        usuarioId: null,
        diasAntes: 1,
        origen: "AUTOMATICO",
        estado: "ENVIADO",
      },
      "rec-previo",
    );
    const { caso, recordatorios, proveedor } = armar({
      turnos: [turno],
      existentes: new Map([["tur-1", [yaEnviado]]]),
    });

    const resultado = await caso.ejecutar();

    expect(resultado.whatsapp).toMatchObject({ enviados: 0, omitidos: 1 });
    expect(recordatorios.registrar).not.toHaveBeenCalled();
    expect(proveedor.preparar).not.toHaveBeenCalled();
  });

  // Un aviso de 3 días que quedó fallido no bloquea el de 1 día, y el
  // reintento del suyo reusa la fila (el índice único no deja insertar otra).
  it("reintenta sobre la misma fila un escalón que había fallado", async () => {
    const fallido = RecordatorioWhatsapp.crear(
      {
        turnoId: "tur-1",
        pacienteId: "pac-1",
        telefono: "5491155554444",
        mensaje: "Intento previo",
        usuarioId: null,
        diasAntes: 1,
        origen: "AUTOMATICO",
      },
      "rec-fallido",
    ).registrarFallo("Meta rechazó el envío");

    const { caso, recordatorios } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
      existentes: new Map([["tur-1", [fallido]]]),
    });

    const resultado = await caso.ejecutar();

    expect(resultado.whatsapp.enviados).toBe(1);
    expect(recordatorios.registrar).not.toHaveBeenCalled();
    const [reintentado] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(reintentado.id).toBe("rec-fallido");
    expect(reintentado.aPrimitivos().error).toBeNull();
  });

  // Lo que el barrido unificado tiene que garantizar: el email sale por la
  // MISMA corrida que WhatsApp. Antes tenía su propio cron y su propio botón,
  // y desde Recordatorios no salía nunca.
  it("manda también por email en la misma corrida", async () => {
    const { caso, enviarEmail } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.email.enviados).toBe(1);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    expect(resultado.enviados).toBe(
      resultado.whatsapp.enviados + resultado.email.enviados,
    );
  });

  // Un medio roto no puede llevarse puesto al otro: son avisos independientes.
  it("si el email falla, WhatsApp sale igual", async () => {
    const { caso, enviarEmail } = armar({
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });
    enviarEmail.mockRejectedValue(new Error("smtp caído"));

    const resultado = await caso.ejecutar();

    expect(resultado.whatsapp.enviados).toBe(1);
    expect(resultado.email.fallidos).toBe(1);
  });

  it("no corre antes de la hora configurada", async () => {
    const { caso, recordatorios } = armar({
      config: configuracionRecordatoriosEjemplo({
        whatsappAutomatico: true,
        horaEnvio: "18:00",
      }),
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.corrio).toBe(false);
    expect(recordatorios.registrar).not.toHaveBeenCalled();
  });

  it("corre en una pasada POSTERIOR a la hora configurada", async () => {
    // El reloj del test son las 09:30 y la hora de envío las 08:00. Con la
    // comparación por igualdad que había antes, un worker que no estuviera
    // vivo justo a las 08 dejaba al consultorio sin recordatorios todo el día,
    // y sin ningún error a la vista. Correr de más no duplica: los dos medios
    // son idempotentes por escalón.
    const { caso } = armar({
      config: configuracionRecordatoriosEjemplo({
        whatsappAutomatico: true,
        whatsappDiasAntes: [1],
        horaEnvio: "08:00",
      }),
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.corrio).toBe(true);
    expect(resultado.whatsapp.enviados).toBe(1);
  });

  it("respeta los minutos de la hora configurada", async () => {
    // 09:30 en el reloj contra 09:45 configuradas: todavía no.
    const { caso } = armar({
      config: configuracionRecordatoriosEjemplo({
        whatsappAutomatico: true,
        horaEnvio: "09:45",
      }),
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    expect((await caso.ejecutar()).corrio).toBe(false);
  });

  it("el disparo manual ignora la hora", async () => {
    const { caso } = armar({
      config: configuracionRecordatoriosEjemplo({
        whatsappAutomatico: true,
        whatsappDiasAntes: [1],
        horaEnvio: "18:00",
      }),
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar({ ignorarHora: true });

    expect(resultado.corrio).toBe(true);
    expect(resultado.whatsapp.enviados).toBe(1);
  });

  it("no manda nada con el envío automático apagado", async () => {
    const { caso } = armar({
      config: configuracionRecordatoriosEjemplo({ whatsappAutomatico: false }),
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar();

    // El barrido sí corre —es la hora—, pero el medio está apagado.
    expect(resultado.corrio).toBe(true);
    expect(resultado.whatsapp.corrio).toBe(false);
    expect(resultado.whatsapp.motivo).toContain("desactivado");
  });

  // Sin plantilla predeterminada no se le inventa un texto al profesional para
  // mandárselo a sus pacientes en su nombre.
  it("no manda nada sin plantilla predeterminada", async () => {
    const { caso, proveedor } = armar({
      plantilla: null,
      turnos: [turnoEjemplo({ fecha: enDias(1) }, "tur-1")],
    });

    const resultado = await caso.ejecutar();

    expect(resultado.whatsapp.corrio).toBe(false);
    expect(proveedor.preparar).not.toHaveBeenCalled();
  });
});

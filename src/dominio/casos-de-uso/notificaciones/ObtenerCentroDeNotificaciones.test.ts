import { describe, it, expect, vi } from "vitest";
import { ObtenerCentroDeNotificaciones } from "./ObtenerCentroDeNotificaciones";
import { EmailEnviado } from "../../entidades/EmailEnviado";
import {
  mockAlertaSeguimientoRepositorio,
  mockMensajeriaRepositorio,
  mockEmailEnviadoRepositorio,
  alertaSeguimientoEjemplo,
} from "../_ayudas-test";
import type { ResumenConversacion } from "../../repositorios/IMensajeriaRepositorio";

function resumenEjemplo(cambios: Partial<ResumenConversacion> = {}): ResumenConversacion {
  return {
    id: "conv-1",
    pacienteId: "pac-1",
    pacienteNombre: "Ana García",
    ultimoMensajeTexto: "Hola, tengo una duda",
    ultimoMensajeEn: new Date("2026-07-20T10:00:00Z"),
    noLeidos: 2,
    ...cambios,
  };
}

function correoEjemplo(cambios: { error?: string | null; creadoEn?: Date } = {}): EmailEnviado {
  return EmailEnviado.crear(
    {
      plantillaClave: "RECORDATORIO_TURNO",
      para: "ana@mail.com",
      asunto: "Recordatorio de tu turno",
      error: cambios.error ?? null,
    },
    "email-1",
    cambios.creadoEn ?? new Date("2026-07-19T09:00:00Z"),
  );
}

describe("ObtenerCentroDeNotificaciones", () => {
  it("une alertas, mensajes sin leer y correos FALLIDOS en un feed ordenado por fecha desc", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockAlertaSeguimientoRepositorio({
        listarPendientes: vi.fn(async () => [
          alertaSeguimientoEjemplo({}, "als-1"), // creadoEn 2026-07-14
        ]),
      }),
      mockMensajeriaRepositorio({
        listarResumen: vi.fn(async () => [resumenEjemplo()]), // 2026-07-20
      }),
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [correoEjemplo({ error: "SMTP timeout" })]), // 2026-07-19
      }),
    );

    const centro = await caso.ejecutar("usr-nutri");

    expect(centro.items).toHaveLength(3);
    expect(centro.items.map((n) => n.tipo)).toEqual(["MENSAJE", "CORREO", "ALERTA"]);
    expect(centro.total).toBe(2); // 1 alerta + 1 conversación con no-leídos
  });

  it("NO muestra los correos enviados con éxito (son log, no notificación)", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockAlertaSeguimientoRepositorio(),
      mockMensajeriaRepositorio(),
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [correoEjemplo(), correoEjemplo()]), // ambos OK
      }),
    );

    const centro = await caso.ejecutar("usr-nutri");

    expect(centro.items).toHaveLength(0);
    expect(centro.total).toBe(0);
  });

  it("enlaza el mensaje directo a la conversación del paciente", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockAlertaSeguimientoRepositorio(),
      mockMensajeriaRepositorio({ listarResumen: vi.fn(async () => [resumenEjemplo()]) }),
      mockEmailEnviadoRepositorio(),
    );

    const centro = await caso.ejecutar("usr-nutri");

    expect(centro.items[0]!.enlace).toBe("/dashboard/mensajes?paciente=pac-1");
  });

  it("ignora conversaciones sin mensajes sin leer", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockAlertaSeguimientoRepositorio(),
      mockMensajeriaRepositorio({
        listarResumen: vi.fn(async () => [resumenEjemplo({ noLeidos: 0 })]),
      }),
      mockEmailEnviadoRepositorio(),
    );

    const centro = await caso.ejecutar("usr-nutri");

    expect(centro.items).toHaveLength(0);
    expect(centro.total).toBe(0);
  });

  it("marca un correo fallido con título de fallo y no lo cuenta en el total", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockAlertaSeguimientoRepositorio(),
      mockMensajeriaRepositorio(),
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [correoEjemplo({ error: "SMTP timeout" })]),
      }),
    );

    const centro = await caso.ejecutar("usr-nutri");

    expect(centro.items).toHaveLength(1);
    expect(centro.items[0]!.tipo).toBe("CORREO");
    expect(centro.items[0]!.titulo).toBe("Falló un envío de correo");
    expect(centro.total).toBe(0);
  });
});

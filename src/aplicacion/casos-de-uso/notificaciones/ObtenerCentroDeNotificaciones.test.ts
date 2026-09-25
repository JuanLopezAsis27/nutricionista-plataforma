import { describe, it, expect, vi } from "vitest";
import { ObtenerCentroDeNotificaciones } from "./ObtenerCentroDeNotificaciones";
import { Notificacion } from "@/dominio/entidades/Notificacion";
import { EmailEnviado } from "@/dominio/entidades/EmailEnviado";
import {
  mockEmailEnviadoRepositorio,
  mockNotificacionRepositorio,
} from "../_ayudas-test";
function correoEjemplo(
  cambios: { error?: string | null; creadoEn?: Date } = {},
): EmailEnviado {
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

/** Notificación persistida de un mensaje del chat de la app. */
function mensajeDeAppEjemplo(vistoEn: Date | null = null) {
  return Notificacion.reconstruir({
    id: "not-msg",
    tipo: "MENSAJE_APP",
    titulo: "Ana García te escribió",
    detalle: "Hola, una consulta",
    pacienteId: "pac-1",
    enlace: "/dashboard/mensajes?paciente=pac-1",
    vistoEn,
    creadoEn: new Date("2026-07-20T10:00:00Z"),
  });
}

describe("ObtenerCentroDeNotificaciones", () => {
  it("une mensajes y correos FALLIDOS en un feed ordenado por fecha desc", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [
          correoEjemplo({ error: "SMTP timeout" }),
        ]), // 2026-07-19
      }),
      mockNotificacionRepositorio({
        listarRecientes: vi.fn(async () => [mensajeDeAppEjemplo()]), // 2026-07-20
        contarNoVistas: vi.fn(async () => 1),
      }),
    );

    const centro = await caso.ejecutar();

    expect(centro.items).toHaveLength(2);
    expect(centro.items.map((n) => n.tipo)).toEqual(["MENSAJE", "CORREO"]);
    expect(centro.total).toBe(1); // el mensaje sin ver
  });

  it("NO muestra los correos enviados con éxito (son log, no notificación)", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [correoEjemplo(), correoEjemplo()]), // ambos OK
      }),
      mockNotificacionRepositorio(),
    );

    const centro = await caso.ejecutar();

    expect(centro.items).toHaveLength(0);
    expect(centro.total).toBe(0);
  });

  it("enlaza el mensaje directo a la conversación del paciente", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio(),
      mockNotificacionRepositorio({
        listarRecientes: vi.fn(async () => [mensajeDeAppEjemplo()]),
      }),
    );

    const centro = await caso.ejecutar();

    expect(centro.items[0]!.enlace).toBe("/dashboard/mensajes?paciente=pac-1");
  });

  it("un mensaje YA VISTO sigue en la lista pero no cuenta para el globo", async () => {
    // Es el cambio que motivó mover los mensajes del chat al lado persistido:
    // antes, leer la conversación los borraba del feed y no había forma de
    // volver a mirarlos.
    const caso = new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio(),
      mockNotificacionRepositorio({
        listarRecientes: vi.fn(async () => [
          mensajeDeAppEjemplo(new Date("2026-07-20T12:00:00Z")),
        ]),
        contarNoVistas: vi.fn(async () => 0),
      }),
    );

    const centro = await caso.ejecutar();

    expect(centro.items).toHaveLength(1);
    expect(centro.items[0]!.tipo).toBe("MENSAJE");
    expect(centro.items[0]!.vista).toBe(true);
    expect(centro.total).toBe(0);
  });

  it("marca un correo fallido con título de fallo y no lo cuenta en el total", async () => {
    const caso = new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [
          correoEjemplo({ error: "SMTP timeout" }),
        ]),
      }),
      mockNotificacionRepositorio(),
    );

    const centro = await caso.ejecutar();

    expect(centro.items).toHaveLength(1);
    expect(centro.items[0]!.tipo).toBe("CORREO");
    expect(centro.items[0]!.titulo).toBe("Falló un envío de correo");
    expect(centro.total).toBe(0);
  });
});

describe("ObtenerCentroDeNotificaciones — notificaciones persistidas", () => {
  function notificacionEjemplo(vistoEn: Date | null, id = "not-1") {
    return Notificacion.reconstruir({
      id,
      tipo: "WHATSAPP_ENTRANTE",
      titulo: "Ana escribió por WhatsApp",
      detalle: "¿Puedo cambiar el turno?",
      pacienteId: "pac-1",
      enlace: "/dashboard/mensajes?paciente=pac-1",
      vistoEn,
      creadoEn: new Date("2026-07-21T10:00:00Z"),
    });
  }

  function armar(persistidas: Notificacion[]) {
    return new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio(),
      mockNotificacionRepositorio({
        listarRecientes: vi.fn(async () => persistidas),
        contarNoVistas: vi.fn(
          async () => persistidas.filter((n) => !n.estaVista).length,
        ),
      }),
    );
  }

  it("las incluye en el feed con su id y su estado de visto", async () => {
    const centro = await armar([notificacionEjemplo(null)]).ejecutar();

    expect(centro.items).toHaveLength(1);
    const [item] = centro.items;
    expect(item!.tipo).toBe("WHATSAPP");
    // El id crudo es lo que la campana necesita para marcarla vista.
    expect(item!.notificacionId).toBe("not-1");
    expect(item!.vista).toBe(false);
  });

  it("solo las NO vistas cuentan para el globo de la campana", async () => {
    const centro = await armar([
      notificacionEjemplo(null, "not-1"),
      notificacionEjemplo(new Date("2026-07-21T11:00:00Z"), "not-2"),
    ]).ejecutar();

    // Las dos se muestran —la campana es también el registro de lo que pasó—
    // pero solo la pendiente suma.
    expect(centro.items).toHaveLength(2);
    expect(centro.total).toBe(1);
  });

  it("los correos fallidos, que son derivados, no traen estado de visto", async () => {
    // Un correo fallido no tiene dónde anotar un "visto": marcarlo desde la
    // campana no tendría a qué apuntar.
    const centro = await new ObtenerCentroDeNotificaciones(
      mockEmailEnviadoRepositorio({
        listarRecientes: vi.fn(async () => [
          correoEjemplo({ error: "SMTP timeout" }),
        ]),
      }),
      mockNotificacionRepositorio(),
    ).ejecutar();

    expect(centro.items[0]!.notificacionId).toBeNull();
    expect(centro.items[0]!.vista).toBeNull();
  });
});

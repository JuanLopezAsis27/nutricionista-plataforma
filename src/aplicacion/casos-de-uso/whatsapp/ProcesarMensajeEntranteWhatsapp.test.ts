import { describe, it, expect, vi } from "vitest";
import { ProcesarMensajeEntranteWhatsapp } from "./ProcesarMensajeEntranteWhatsapp";
import { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import { Notificacion } from "@/dominio/entidades/Notificacion";
import { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import { RegistrarRespuestaDeRecordatorio } from "../recordatorios/RegistrarRespuestaDeRecordatorio";
import type { AtenderBotonWhatsapp } from "./AtenderBotonWhatsapp";
import type { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import {
  mockMensajeWhatsappRepositorio,
  mockNotificacionRepositorio,
  mockReloj,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockRecordatorioWhatsappRepositorio,
  mockUsuarioRepositorio,
  mockBusEventos,
  pacienteEjemplo,
  usuarioEjemplo,
  recordatorioWhatsappEjemplo,
  mockTurnoRepositorio,
} from "../_ayudas-test";

const ENTRANTE = {
  telefono: "5491155554444",
  cuerpo: "Hola, ¿puedo mover el turno?",
  idExterno: "wamid.ABC",
  enviadoEn: new Date("2026-08-24T14:00:00Z"),
};

function armar(
  pacientes = [pacienteEjemplo({ telefono: "011 15 5555-4444" })],
  recordatoriosPendientes: RecordatorioWhatsapp[] = [],
  atiendeElBoton = false,
) {
  const mensajes = mockMensajeWhatsappRepositorio();
  const notificaciones = mockNotificacionRepositorio();
  const atenderBoton = {
    ejecutar: vi.fn(async () => atiendeElBoton),
  } as unknown as AtenderBotonWhatsapp;
  const bus = mockBusEventos();
  const recordatorios = mockRecordatorioWhatsappRepositorio({
    sinRespuestaDePaciente: vi.fn(async () => recordatoriosPendientes),
  });
  const caso = new ProcesarMensajeEntranteWhatsapp(
    mensajes,
    new ResolverPacientePorTelefono(
      // El repositorio real resuelve por el E.164 persistido en el paciente
      // (con índice), no recorriendo la tabla. El mock imita esa búsqueda: la
      // canonización del teléfono ya la hizo la entidad al crearlo, que es
      // donde ahora vive.
      mockPacienteRepositorio({
        listarPorTelefonoE164: vi.fn(async (e164: string) =>
          pacientes.filter((p) => p.telefonoE164 === e164),
        ),
      }),
      mockConfiguracionRepositorio(),
      mensajes,
      mockTurnoRepositorio(),
    ),
    mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioEjemplo({}, "usr-nutri")]),
    }),
    bus,
    new RegistrarRespuestaDeRecordatorio(recordatorios),
    new EmitirNotificacion(notificaciones, mockReloj()),
    atenderBoton,
  );
  return { caso, mensajes, bus, recordatorios, notificaciones, atenderBoton };
}

describe("ProcesarMensajeEntranteWhatsapp", () => {
  it("guarda el mensaje de un paciente aunque su teléfono esté cargado en formato local", async () => {
    const { caso, mensajes } = armar();

    const resultado = await caso.ejecutar(ENTRANTE);

    expect(resultado).toEqual({
      estado: "GUARDADO",
      pacienteId: "pac-1",
      recordatoriosMarcados: 0,
    });
    expect(mensajes.crear).toHaveBeenCalledTimes(1);
    const [entidad] = vi.mocked(mensajes.crear).mock.calls[0]!;
    expect(entidad.aPrimitivos()).toMatchObject({
      pacienteId: "pac-1",
      direccion: "ENTRANTE",
      idExterno: "wamid.ABC",
      estado: "ENTREGADO",
    });
  });

  // La garantía de privacidad: el WhatsApp personal del profesional no entra a
  // la app, y no entra porque no se persiste, no porque se filtre en la vista.
  it("descarta sin persistir nada el mensaje de un número que no es paciente", async () => {
    const { caso, mensajes, bus } = armar([
      pacienteEjemplo({ telefono: "1122223333" }),
    ]);

    const resultado = await caso.ejecutar(ENTRANTE);

    expect(resultado).toEqual({ estado: "DESCARTADO", motivo: "SIN_PACIENTE" });
    expect(mensajes.crear).not.toHaveBeenCalled();
    expect(bus.publicar).not.toHaveBeenCalled();
  });

  it("descarta los pacientes sin teléfono cargado en lugar de romper", async () => {
    const { caso, mensajes } = armar([pacienteEjemplo({ telefono: null })]);

    const resultado = await caso.ejecutar(ENTRANTE);

    expect(resultado).toEqual({ estado: "DESCARTADO", motivo: "SIN_PACIENTE" });
    expect(mensajes.crear).not.toHaveBeenCalled();
  });

  it("ignora el reintento de un wamid ya procesado", async () => {
    const { caso, mensajes } = armar();
    vi.mocked(mensajes.obtenerPorIdExterno).mockResolvedValueOnce(
      MensajeWhatsapp.crear(
        {
          pacienteId: "pac-1",
          direccion: "ENTRANTE",
          telefono: "549",
          cuerpo: "hola",
        },
        "msg-1",
      ),
    );

    const resultado = await caso.ejecutar(ENTRANTE);

    expect(resultado).toEqual({ estado: "DESCARTADO", motivo: "DUPLICADO" });
    expect(mensajes.crear).not.toHaveBeenCalled();
  });

  it("avisa al nutricionista por el bus de eventos", async () => {
    const { caso, bus } = armar();

    await caso.ejecutar(ENTRANTE);

    expect(bus.publicar).toHaveBeenCalledWith({
      tipo: "whatsapp.mensaje",
      usuarioId: "usr-nutri",
      datos: { pacienteId: "pac-1" },
    });
  });
});

describe("ProcesarMensajeEntranteWhatsapp — notificación", () => {
  it("deja una notificación persistida cuando el paciente escribe", async () => {
    // El bus solo llega a quien tenga la app abierta en ese instante. Un
    // WhatsApp que entra a las 22:00 tiene que seguir estando a la mañana.
    const { caso, notificaciones } = armar();

    await caso.ejecutar({
      telefono: "5491155554444",
      cuerpo: "Hola, ¿puedo cambiar el turno del jueves?",
      idExterno: "wamid.notif",
      enviadoEn: new Date("2026-07-20T22:10:00Z"),
    });

    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
    const [creada] = (notificaciones.crear as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Notificacion];
    expect(creada.tipo).toBe("WHATSAPP_ENTRANTE");
    // El detalle adelanta el mensaje: la campana tiene que servir para decidir
    // si hay que abrirlo ahora o puede esperar.
    expect(creada.detalle).toContain("cambiar el turno");
    expect(creada.enlace).toContain("/dashboard/mensajes");
  });

  it("no notifica si el número no es de un paciente", async () => {
    // Es el mismo criterio que el del descarte: un chat personal del
    // profesional no se persiste en ningún lado, tampoco como aviso.
    const { caso, notificaciones } = armar([]);

    await caso.ejecutar({
      telefono: "5491133332222",
      cuerpo: "hola",
      idExterno: "wamid.ajeno",
      enviadoEn: new Date("2026-07-20T22:10:00Z"),
    });

    expect(notificaciones.crear).not.toHaveBeenCalled();
  });

  it("un mensaje repetido (reintento de Meta) no notifica dos veces", async () => {
    const { caso, notificaciones } = armar();
    const mensaje = {
      telefono: "5491155554444",
      cuerpo: "hola",
      idExterno: "wamid.repetido",
      enviadoEn: new Date("2026-07-20T22:10:00Z"),
    };

    await caso.ejecutar(mensaje);
    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
  });
});

describe("ProcesarMensajeEntranteWhatsapp — agrupado del aviso", () => {
  it("una ráfaga del mismo paciente deja UN aviso con el último texto", async () => {
    // Por WhatsApp se escribe una idea por mensaje: diez mensajes en un minuto
    // dejaban diez líneas idénticas en la campana y tapaban todo lo demás.
    const pendiente = Notificacion.crear(
      {
        tipo: "WHATSAPP_ENTRANTE",
        titulo: "Ana García escribió por WhatsApp",
        detalle: "el primero",
        pacienteId: "pac-1",
        enlace: null,
      },
      "not-1",
    );
    const { caso, notificaciones } = armar();
    (
      notificaciones.obtenerNoVistaDe as ReturnType<typeof vi.fn>
    ).mockResolvedValue(pendiente);

    await caso.ejecutar({
      telefono: "5491155554444",
      cuerpo: "el segundo",
      idExterno: "wamid.rafaga",
      enviadoEn: new Date("2026-07-20T22:10:00Z"),
    });

    expect(notificaciones.crear).not.toHaveBeenCalled();
    expect(notificaciones.actualizar).toHaveBeenCalledTimes(1);
    const [refrescada] = (notificaciones.actualizar as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [Notificacion];
    expect(refrescada.detalle).toBe("el segundo");
  });
});

describe("ProcesarMensajeEntranteWhatsapp — botones de plantilla", () => {
  const TOQUE = {
    ...ENTRANTE,
    idExterno: "wamid.BTN",
    cuerpo: "Confirmo",
    payloadBoton: "CONFIRMAR_TURNO:tur-1",
  };

  it("un botón que actuó no suma el aviso de «escribió por WhatsApp»", async () => {
    // El botón ya dejó el suyo (turno confirmado): dos avisos dirían lo mismo.
    const { caso, mensajes, notificaciones, atenderBoton } = armar(
      undefined,
      [],
      true,
    );

    await caso.ejecutar(TOQUE);

    expect(atenderBoton.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pac-1" }),
      { accion: "CONFIRMAR_TURNO", turnoId: "tur-1" },
    );
    // El toque igual queda en el chat.
    expect(mensajes.crear).toHaveBeenCalledTimes(1);
    expect(notificaciones.crear).not.toHaveBeenCalled();
  });

  it("si el botón no pudo actuar, el aviso de siempre cuenta que escribió", async () => {
    const { caso, notificaciones } = armar(undefined, [], false);

    await caso.ejecutar(TOQUE);

    expect(notificaciones.crear).toHaveBeenCalledTimes(1);
  });

  it("marca CONFIRMADO el recordatorio aunque «Confirmo» no esté entre las afirmaciones", async () => {
    const pendiente = recordatorioWhatsappEjemplo({ estado: "ENVIADO" });
    const { caso, recordatorios } = armar(undefined, [pendiente], true);

    await caso.ejecutar({ ...TOQUE, cuerpo: "Ahí estaré sin falta, gracias" });

    const [marcado] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(marcado.estado).toBe("CONFIRMADO");
  });

  it("un mensaje de texto común no pasa por los botones", async () => {
    const { caso, atenderBoton } = armar();

    await caso.ejecutar(ENTRANTE);

    expect(atenderBoton.ejecutar).not.toHaveBeenCalled();
  });
});

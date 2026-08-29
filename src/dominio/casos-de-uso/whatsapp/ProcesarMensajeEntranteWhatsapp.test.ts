import { describe, it, expect, vi } from "vitest";
import { ProcesarMensajeEntranteWhatsapp } from "./ProcesarMensajeEntranteWhatsapp";
import { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import { RegistrarRespuestaDeRecordatorio } from "../recordatorios/RegistrarRespuestaDeRecordatorio";
import type { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { MensajeWhatsapp } from "../../entidades/MensajeWhatsapp";
import {
  mockMensajeWhatsappRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  mockRecordatorioWhatsappRepositorio,
  mockUsuarioRepositorio,
  mockBusEventos,
  pacienteEjemplo,
  usuarioEjemplo,
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
) {
  const mensajes = mockMensajeWhatsappRepositorio();
  const bus = mockBusEventos();
  const recordatorios = mockRecordatorioWhatsappRepositorio({
    sinRespuestaDePaciente: vi.fn(async () => recordatoriosPendientes),
  });
  const caso = new ProcesarMensajeEntranteWhatsapp(
    mensajes,
    new ResolverPacientePorTelefono(
      // El repositorio real resuelve por el E.164 persistido en el paciente
      // (índice único por inquilino), no recorriendo la tabla. El mock imita
      // esa búsqueda: la canonización del teléfono ya la hizo la entidad al
      // crearlo, que es donde ahora vive.
      mockPacienteRepositorio({
        obtenerPorTelefonoE164: vi.fn(
          async (e164: string) => pacientes.find((p) => p.telefonoE164 === e164) ?? null,
        ),
      }),
      mockConfiguracionRepositorio(),
    ),
    mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [usuarioEjemplo({}, "usr-nutri")]),
    }),
    bus,
    new RegistrarRespuestaDeRecordatorio(recordatorios),
  );
  return { caso, mensajes, bus, recordatorios };
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
    const { caso, mensajes, bus } = armar([pacienteEjemplo({ telefono: "1122223333" })]);

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
        { pacienteId: "pac-1", direccion: "ENTRANTE", telefono: "549", cuerpo: "hola" },
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

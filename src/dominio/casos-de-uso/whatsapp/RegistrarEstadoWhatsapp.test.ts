import { describe, it, expect, vi } from "vitest";
import { RegistrarEstadoWhatsapp } from "./RegistrarEstadoWhatsapp";
import { MensajeWhatsapp } from "../../entidades/MensajeWhatsapp";
import {
  mockMensajeWhatsappRepositorio,
  mockRecordatorioWhatsappRepositorio,
  recordatorioWhatsappEjemplo,
} from "../_ayudas-test";

function mensajeEjemplo(estado: "ENVIADO" | "LEIDO" = "ENVIADO"): MensajeWhatsapp {
  return MensajeWhatsapp.crear(
    {
      pacienteId: "pac-1",
      direccion: "SALIENTE",
      telefono: "5491155554444",
      cuerpo: "Te recuerdo tu turno.",
      idExterno: "wamid.ABC",
      estado,
    },
    "msg-1",
  );
}

describe("RegistrarEstadoWhatsapp", () => {
  it("avanza el estado de entrega del mensaje", async () => {
    const mensajes = mockMensajeWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () => mensajeEjemplo()),
    });
    const caso = new RegistrarEstadoWhatsapp(mensajes, mockRecordatorioWhatsappRepositorio());

    await caso.ejecutar([{ idExterno: "wamid.ABC", estado: "LEIDO" }]);

    const [actualizado] = vi.mocked(mensajes.actualizar).mock.calls[0]!;
    expect(actualizado.aPrimitivos().estado).toBe("LEIDO");
  });

  // Los webhooks de Meta llegan desordenados: `delivered` después de `read` no
  // puede hacer retroceder el tilde azul.
  it("no retrocede a un estado anterior", async () => {
    const mensajes = mockMensajeWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () => mensajeEjemplo("LEIDO")),
    });
    const caso = new RegistrarEstadoWhatsapp(mensajes, mockRecordatorioWhatsappRepositorio());

    await caso.ejecutar([{ idExterno: "wamid.ABC", estado: "ENTREGADO" }]);

    expect(mensajes.actualizar).not.toHaveBeenCalled();
  });

  it("marca como fallido con el motivo del proveedor", async () => {
    const mensajes = mockMensajeWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () => mensajeEjemplo()),
    });
    const caso = new RegistrarEstadoWhatsapp(mensajes, mockRecordatorioWhatsappRepositorio());

    await caso.ejecutar([
      { idExterno: "wamid.ABC", estado: "FALLIDO", error: "Fuera de la ventana de 24 h" },
    ]);

    const [actualizado] = vi.mocked(mensajes.actualizar).mock.calls[0]!;
    expect(actualizado.aPrimitivos()).toMatchObject({
      estado: "FALLIDO",
      error: "Fuera de la ventana de 24 h",
    });
  });

  // Lo que la Fase A no podía hacer: confirmar el envío sin preguntarle al nutri.
  it("confirma el recordatorio cuando WhatsApp informa que salió", async () => {
    const recordatorios = mockRecordatorioWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () => recordatorioWhatsappEjemplo({ idExterno: "wamid.ABC" })),
    });
    const caso = new RegistrarEstadoWhatsapp(mockMensajeWhatsappRepositorio(), recordatorios);

    await caso.ejecutar([{ idExterno: "wamid.ABC", estado: "ENVIADO" }]);

    const [resuelto] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(resuelto.estado).toBe("CONFIRMADO");
  });

  it("descarta el recordatorio si el envío falló", async () => {
    const recordatorios = mockRecordatorioWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () => recordatorioWhatsappEjemplo({ idExterno: "wamid.ABC" })),
    });
    const caso = new RegistrarEstadoWhatsapp(mockMensajeWhatsappRepositorio(), recordatorios);

    await caso.ejecutar([{ idExterno: "wamid.ABC", estado: "FALLIDO" }]);

    const [resuelto] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(resuelto.estado).toBe("DESCARTADO");
  });

  it("no vuelve a resolver un recordatorio ya confirmado a mano", async () => {
    const recordatorios = mockRecordatorioWhatsappRepositorio({
      obtenerPorIdExterno: vi.fn(async () =>
        recordatorioWhatsappEjemplo({ idExterno: "wamid.ABC" }).confirmar(),
      ),
    });
    const caso = new RegistrarEstadoWhatsapp(mockMensajeWhatsappRepositorio(), recordatorios);

    await caso.ejecutar([{ idExterno: "wamid.ABC", estado: "LEIDO" }]);

    expect(recordatorios.actualizar).not.toHaveBeenCalled();
  });
});

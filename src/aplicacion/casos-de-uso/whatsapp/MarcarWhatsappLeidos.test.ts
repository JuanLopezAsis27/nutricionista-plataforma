import { describe, it, expect, vi } from "vitest";
import { MarcarWhatsappLeidos } from "./MarcarWhatsappLeidos";
import { MarcarAvisosDeConversacionVistos } from "../notificaciones/MarcarAvisosDeConversacionVistos";
import {
  mockMensajeWhatsappRepositorio,
  mockNotificacionRepositorio,
  mockReloj,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

describe("MarcarWhatsappLeidos", () => {
  it("marca leídos los entrantes y apaga SOLO el aviso de WhatsApp del paciente", async () => {
    const mensajes = mockMensajeWhatsappRepositorio();
    const notificaciones = mockNotificacionRepositorio();
    const caso = new MarcarWhatsappLeidos(
      mensajes,
      new MarcarAvisosDeConversacionVistos(notificaciones, mockReloj(AHORA)),
      mockReloj(AHORA),
      mockPacienteRepositorio(),
    );

    await caso.ejecutar("pac-1");

    expect(mensajes.marcarLeidos).toHaveBeenCalledWith("pac-1", AHORA, null);
    // Ni el chat del portal ni los pedidos sobre turnos: abrir WhatsApp no
    // atiende una reprogramación.
    expect(notificaciones.marcarVistasDePaciente).toHaveBeenCalledWith(
      "pac-1",
      ["WHATSAPP_ENTRANTE"],
      AHORA,
    );
  });

  it("si falla apagar el aviso, los mensajes igual quedan leídos", async () => {
    const mensajes = mockMensajeWhatsappRepositorio();
    const caso = new MarcarWhatsappLeidos(
      mensajes,
      new MarcarAvisosDeConversacionVistos(
        mockNotificacionRepositorio({
          marcarVistasDePaciente: vi.fn(async () => {
            throw new Error("base caída");
          }),
        }),
        mockReloj(AHORA),
      ),
      mockReloj(AHORA),
      mockPacienteRepositorio(),
    );

    await expect(caso.ejecutar("pac-1")).resolves.toBeUndefined();
    expect(mensajes.marcarLeidos).toHaveBeenCalled();
  });

  it("con el número compartido, deja leído todo el número y apaga los avisos de todas las fichas", async () => {
    const sofia = pacienteEjemplo({ telefono: "11 5555 4444" }, "pac-1");
    const tomas = pacienteEjemplo({ telefono: "11 5555 4444" }, "pac-2");
    const mensajes = mockMensajeWhatsappRepositorio();
    const notificaciones = mockNotificacionRepositorio();
    const caso = new MarcarWhatsappLeidos(
      mensajes,
      new MarcarAvisosDeConversacionVistos(notificaciones, mockReloj(AHORA)),
      mockReloj(AHORA),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => sofia),
        listarPorTelefonoE164: vi.fn(async () => [sofia, tomas]),
      }),
    );

    await caso.ejecutar("pac-1");

    expect(mensajes.marcarLeidos).toHaveBeenCalledWith(
      "pac-1",
      AHORA,
      sofia.telefonoE164,
    );
    const fichas = vi
      .mocked(notificaciones.marcarVistasDePaciente)
      .mock.calls.map(([id]) => id);
    expect(fichas).toEqual(["pac-1", "pac-2"]);
  });
});

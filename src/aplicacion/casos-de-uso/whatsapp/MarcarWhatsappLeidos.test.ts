import { describe, it, expect, vi } from "vitest";
import { MarcarWhatsappLeidos } from "./MarcarWhatsappLeidos";
import { MarcarAvisosDeConversacionVistos } from "../notificaciones/MarcarAvisosDeConversacionVistos";
import {
  mockMensajeWhatsappRepositorio,
  mockNotificacionRepositorio,
  mockReloj,
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
    );

    await caso.ejecutar("pac-1");

    expect(mensajes.marcarLeidos).toHaveBeenCalledWith("pac-1", AHORA);
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
    );

    await expect(caso.ejecutar("pac-1")).resolves.toBeUndefined();
    expect(mensajes.marcarLeidos).toHaveBeenCalled();
  });
});

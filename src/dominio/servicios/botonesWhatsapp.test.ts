import { describe, it, expect } from "vitest";
import { payloadDeBoton, leerPayloadDeBoton } from "./botonesWhatsapp";

describe("payload de los botones de WhatsApp", () => {
  it("ida y vuelta: la acción y el turno sobreviven al viaje por Meta", () => {
    const payload = payloadDeBoton("CONFIRMAR_TURNO", "tur-1");

    expect(leerPayloadDeBoton(payload)).toEqual({
      accion: "CONFIRMAR_TURNO",
      turnoId: "tur-1",
    });
  });

  it("un botón sin acción, o sin turno, no pide nada", () => {
    expect(leerPayloadDeBoton(payloadDeBoton("NINGUNA", "tur-1"))).toBeNull();
    expect(
      leerPayloadDeBoton(payloadDeBoton("PEDIR_REPROGRAMACION", null)),
    ).toBeNull();
  });

  it("ignora lo que no armó la app: Meta usa el texto como payload por defecto", () => {
    expect(leerPayloadDeBoton("Confirmo")).toBeNull();
    expect(leerPayloadDeBoton("BORRAR_TODO:tur-1")).toBeNull();
    expect(leerPayloadDeBoton("CONFIRMAR_TURNO:")).toBeNull();
    expect(leerPayloadDeBoton(null)).toBeNull();
  });
});

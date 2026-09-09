import { describe, it, expect, vi } from "vitest";
import { construirEnlaceWhatsapp } from "./enlace";
import { ObtenerHiloWhatsapp } from "./ObtenerHiloWhatsapp";
import { EnviarMensajeWhatsapp } from "./EnviarMensajeWhatsapp";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockMensajeWhatsappRepositorio,
  mockProveedorWhatsapp,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

/**
 * Tests del hilo de WhatsApp dentro de la app.
 *
 * El concepto que atraviesa el módulo es **la ventana de 24 h de Meta**: solo
 * se puede escribir texto libre dentro de las 24 h posteriores al último
 * mensaje del paciente; fuera de eso hace falta una plantilla aprobada. La app
 * calcula esa ventana para avisar ANTES de que el envío falle, en vez de
 * dejar que el profesional escriba un mensaje que Meta va a rechazar.
 */

const AHORA = new Date("2026-07-01T12:00:00.000Z");

function entrante(hace: number) {
  return MensajeWhatsapp.crear(
    {
      pacienteId: "pac-1",
      direccion: "ENTRANTE",
      telefono: "541155554444",
      cuerpo: "Hola",
      estado: "ENTREGADO",
    },
    "msg-1",
    new Date(AHORA.getTime() - hace),
  );
}

const HORA = 60 * 60 * 1000;

describe("construirEnlaceWhatsapp", () => {
  it("arma el wa.me con el texto ya escrito", () => {
    const enlace = construirEnlaceWhatsapp("541155554444", "Hola Ana");

    expect(enlace.startsWith("https://wa.me/541155554444?text=")).toBe(true);
  });

  it("escapa el texto: un & o un # partirían la URL", () => {
    const enlace = construirEnlaceWhatsapp("541155554444", "Turno #3 y más");

    expect(enlace).toContain(encodeURIComponent("Turno #3 y más"));
    expect(enlace).not.toContain("#3");
  });

  it("conserva los saltos de línea del mensaje", () => {
    // Los recordatorios son multilínea. Sin escapar, el salto corta la URL y
    // el paciente recibe medio mensaje.
    const enlace = construirEnlaceWhatsapp("54115", "Hola\nTe espero");

    expect(enlace).toContain("%0A");
  });
});

describe("ObtenerHiloWhatsapp", () => {
  it("sin API conectada devuelve el hilo vacío, no falla", () => {
    // Con el enlace wa.me los mensajes los manda el profesional desde su
    // teléfono: la app no tiene hilo que mostrar y la UI usa esto para no
    // ofrecer la caja de texto.
    const caso = new ObtenerHiloWhatsapp(
      mockMensajeWhatsappRepositorio(),
      mockProveedorWhatsapp({
        modoActual: vi.fn(async () => "ENLACE" as const),
      }),
    );

    return caso.ejecutar("pac-1", AHORA).then((hilo) => {
      expect(hilo.conectado).toBe(false);
      expect(hilo.mensajes).toEqual([]);
      expect(hilo.ventanaAbierta).toBe(false);
      expect(hilo.ventanaVenceEn).toBeNull();
    });
  });

  it("la ventana está ABIERTA si el paciente escribió hace menos de 24 h", async () => {
    const caso = new ObtenerHiloWhatsapp(
      mockMensajeWhatsappRepositorio({
        ultimoEntrante: vi.fn(async () => entrante(3 * HORA)),
      }),
      mockProveedorWhatsapp({ modoActual: vi.fn(async () => "API" as const) }),
    );

    const hilo = await caso.ejecutar("pac-1", AHORA);

    expect(hilo.conectado).toBe(true);
    expect(hilo.ventanaAbierta).toBe(true);
    expect(hilo.ventanaVenceEn).toEqual(
      new Date(AHORA.getTime() - 3 * HORA + 24 * HORA),
    );
  });

  it("la ventana está CERRADA pasadas las 24 h", async () => {
    const caso = new ObtenerHiloWhatsapp(
      mockMensajeWhatsappRepositorio({
        ultimoEntrante: vi.fn(async () => entrante(25 * HORA)),
      }),
      mockProveedorWhatsapp({ modoActual: vi.fn(async () => "API" as const) }),
    );

    const hilo = await caso.ejecutar("pac-1", AHORA);

    expect(hilo.ventanaAbierta).toBe(false);
    // La fecha de vencimiento igual se informa: la UI dice desde cuándo está
    // cerrada, que es más útil que un simple "no se puede".
    expect(hilo.ventanaVenceEn).not.toBeNull();
  });

  it("sin ningún mensaje entrante la ventana nunca estuvo abierta", async () => {
    // El paciente todavía no escribió: solo se le puede mandar plantilla.
    const caso = new ObtenerHiloWhatsapp(
      mockMensajeWhatsappRepositorio({
        ultimoEntrante: vi.fn(async () => null),
      }),
      mockProveedorWhatsapp({ modoActual: vi.fn(async () => "API" as const) }),
    );

    const hilo = await caso.ejecutar("pac-1", AHORA);

    expect(hilo.ventanaAbierta).toBe(false);
    expect(hilo.ventanaVenceEn).toBeNull();
  });
});

describe("EnviarMensajeWhatsapp", () => {
  function armar(modo: "API" | "ENLACE") {
    const mensajes = mockMensajeWhatsappRepositorio();
    const proveedor = mockProveedorWhatsapp({
      preparar: vi.fn(async () =>
        modo === "API"
          ? { modo: "API" as const, idExterno: "wamid.1" }
          : { modo: "ENLACE" as const, enlace: "https://wa.me/1" },
      ),
    });
    return {
      caso: new EnviarMensajeWhatsapp(
        mensajes,
        mockPacienteRepositorio({
          obtenerPorId: vi.fn(async () =>
            pacienteEjemplo({ telefono: "1155554444" }),
          ),
        }),
        mockConfiguracionRepositorio({
          obtener: vi.fn(async () => ConfiguracionConsultorio.porDefecto()),
        }),
        proveedor,
      ),
      mensajes,
    };
  }

  it("persiste el mensaje cuando la API lo envió", async () => {
    const { caso, mensajes } = armar("API");

    await caso.ejecutar("pac-1", "Hola Ana");

    expect(mensajes.crear).toHaveBeenCalledTimes(1);
  });

  it("RECHAZA el envío si no hay API: no finge que salió", async () => {
    // Con el enlace wa.me el mensaje lo manda el profesional a mano y no hay
    // nada que persistir. Guardar una fila igual dejaría el historial diciendo
    // que se envió algo que quizá nunca se mandó.
    const { caso, mensajes } = armar("ENLACE");

    await expect(caso.ejecutar("pac-1", "Hola")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(mensajes.crear).not.toHaveBeenCalled();
  });

  it("falla si el paciente no existe", async () => {
    const caso = new EnviarMensajeWhatsapp(
      mockMensajeWhatsappRepositorio(),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockConfiguracionRepositorio(),
      mockProveedorWhatsapp(),
    );

    await expect(caso.ejecutar("pac-inexistente", "Hola")).rejects.toThrow();
  });
});

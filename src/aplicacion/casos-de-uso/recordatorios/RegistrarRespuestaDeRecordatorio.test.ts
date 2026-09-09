import { describe, it, expect, vi } from "vitest";
import {
  RegistrarRespuestaDeRecordatorio,
  esConfirmacion,
} from "./RegistrarRespuestaDeRecordatorio";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { mockRecordatorioWhatsappRepositorio } from "../_ayudas-test";

function enviado(id = "rec-1"): RecordatorioWhatsapp {
  return RecordatorioWhatsapp.crear(
    {
      turnoId: "tur-1",
      pacienteId: "pac-1",
      telefono: "5491155554444",
      mensaje: "Te recuerdo tu turno.",
      usuarioId: null,
      estado: "ENVIADO",
    },
    id,
  );
}

function armar(pendientes: RecordatorioWhatsapp[]) {
  const recordatorios = mockRecordatorioWhatsappRepositorio({
    sinRespuestaDePaciente: vi.fn(async () => pendientes),
  });
  return {
    caso: new RegistrarRespuestaDeRecordatorio(recordatorios),
    recordatorios,
  };
}

describe("RegistrarRespuestaDeRecordatorio", () => {
  it("marca RESPONDIDO cuando el paciente escribe cualquier cosa", async () => {
    const { caso, recordatorios } = armar([enviado()]);

    const resultado = await caso.ejecutar(
      "pac-1",
      "Uy, me olvidé de avisarte algo",
    );

    expect(resultado).toEqual({ marcados: 1, confirmo: false });
    const [actualizado] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(actualizado.estado).toBe("RESPONDIDO");
    expect(actualizado.aPrimitivos().respondidoEn).not.toBeNull();
  });

  it("marca CONFIRMADO ante una afirmación corta", async () => {
    const { caso, recordatorios } = armar([enviado()]);

    const resultado = await caso.ejecutar("pac-1", "Sí, confirmo!");

    expect(resultado.confirmo).toBe(true);
    const [actualizado] = vi.mocked(recordatorios.actualizar).mock.calls[0]!;
    expect(actualizado.estado).toBe("CONFIRMADO");
  });

  it("no hace nada si el paciente no tenía recordatorios a la espera", async () => {
    const { caso, recordatorios } = armar([]);

    const resultado = await caso.ejecutar("pac-1", "Hola");

    expect(resultado.marcados).toBe(0);
    expect(recordatorios.actualizar).not.toHaveBeenCalled();
  });
});

describe("esConfirmacion", () => {
  it("reconoce las afirmaciones cortas, con y sin acento", () => {
    for (const texto of [
      "sí",
      "Si",
      "OK",
      "dale",
      "listo",
      "confirmo",
      "Perfecto!",
    ]) {
      expect(esConfirmacion(texto)).toBe(true);
    }
  });

  // Lo importante no es acertar todos los sí: es no inventar ninguno. Dar por
  // confirmado un turno que el paciente está cancelando es el error caro.
  it("no confirma cuando hay una negación de por medio", () => {
    for (const texto of [
      "no puedo, dale para la semana que viene",
      "Dale pero no esta semana",
      "no",
      "cancelo el turno",
    ]) {
      expect(esConfirmacion(texto)).toBe(false);
    }
  });

  it("no confirma una respuesta larga, aunque empiece con un sí", () => {
    expect(
      esConfirmacion(
        "Si, aunque te quería preguntar si podemos moverlo un poco más tarde",
      ),
    ).toBe(false);
  });

  it("no confirma un texto vacío", () => {
    expect(esConfirmacion("   ")).toBe(false);
  });
});

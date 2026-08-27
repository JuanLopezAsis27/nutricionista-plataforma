import { describe, it, expect } from "vitest";
import { normalizarTelefonoE164 } from "./telefono";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

describe("normalizarTelefonoE164", () => {
  // El caso que importa: sin el 9 después del 54, wa.me abre WhatsApp pero no
  // encuentra el chat, y el nutricionista cree que el número está mal cargado.
  it.each([
    ["011 15 5555-4444", "5491155554444"],
    ["+54 9 11 5555 4444", "5491155554444"],
    ["1155554444", "5491155554444"],
    ["54 11 5555 4444", "5491155554444"],
    ["+5491155554444", "5491155554444"],
    ["005491155554444", "5491155554444"],
    ["(0351) 15-555-4444", "5493515554444"],
  ])("normaliza %s a %s", (entrada, esperado) => {
    expect(normalizarTelefonoE164(entrada, "54")).toBe(esperado);
  });

  it("respeta otros prefijos de país sin tocar el 9 argentino", () => {
    expect(normalizarTelefonoE164("612345678", "34")).toBe("34612345678");
  });

  it("deja pasar un internacional de otro país tal cual", () => {
    expect(normalizarTelefonoE164("+34 612 345 678", "54")).toBe("34612345678");
  });

  it("rechaza un teléfono vacío", () => {
    expect(() => normalizarTelefonoE164("", "54")).toThrow(ErrorValidacion);
    expect(() => normalizarTelefonoE164(null, "54")).toThrow(ErrorValidacion);
  });

  it("rechaza un texto sin dígitos", () => {
    expect(() => normalizarTelefonoE164("no tiene", "54")).toThrow(ErrorValidacion);
  });

  it("rechaza un número demasiado largo", () => {
    expect(() => normalizarTelefonoE164("+1234567890123456789", "54")).toThrow(ErrorValidacion);
  });
});

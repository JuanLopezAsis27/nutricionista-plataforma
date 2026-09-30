import { describe, it, expect } from "vitest";
import {
  ALFABETO_CODIGO_INVITACION,
  LARGO_CODIGO_INVITACION,
  normalizarCodigoInvitacion,
  formatearCodigoInvitacion,
  esCodigoInvitacionBienFormado,
} from "./codigoInvitacion";

describe("código de invitación", () => {
  it("el alfabeto deja afuera lo que se confunde al dictarlo", () => {
    for (const confuso of ["0", "O", "1", "I", "L"]) {
      expect(ALFABETO_CODIGO_INVITACION).not.toContain(confuso);
    }
    expect(new Set(ALFABETO_CODIGO_INVITACION).size).toBe(
      ALFABETO_CODIGO_INVITACION.length,
    );
  });

  it("normaliza sin castigar guiones, espacios ni minúsculas", () => {
    expect(normalizarCodigoInvitacion(" k7pm-x3qd ")).toBe("K7PMX3QD");
    expect(normalizarCodigoInvitacion("K7PM X3QD")).toBe("K7PMX3QD");
  });

  it("formatea en dos grupos de cuatro", () => {
    expect(formatearCodigoInvitacion("k7pmx3qd")).toBe("K7PM-X3QD");
  });

  it("valida el largo y el alfabeto", () => {
    expect(esCodigoInvitacionBienFormado("K7PMX3QD")).toBe(true);
    expect(esCodigoInvitacionBienFormado("K7PMX3Q")).toBe(false);
    expect(esCodigoInvitacionBienFormado("K7PMX3QDA")).toBe(false);
    // «0» y «O» no están en el alfabeto: un código así no pudo emitirse.
    expect(esCodigoInvitacionBienFormado("K7PM03QD")).toBe(false);
    expect(esCodigoInvitacionBienFormado("K7PMO3QD")).toBe(false);
    expect("K7PMX3QD").toHaveLength(LARGO_CODIGO_INVITACION);
  });
});

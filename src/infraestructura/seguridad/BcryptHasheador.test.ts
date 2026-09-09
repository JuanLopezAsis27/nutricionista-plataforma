import { describe, it, expect } from "vitest";
import { necesitaRehash, RONDAS_BCRYPT } from "./BcryptHasheador";

describe("necesitaRehash", () => {
  it("detecta un hash guardado con menos rondas que las actuales", () => {
    // El costo viaja dentro del propio hash: $2a$<costo>$<sal+digest>
    expect(necesitaRehash("$2a$10$abcdefghijklmnopqrstuv")).toBe(true);
  });

  it("no toca un hash que ya está al costo actual", () => {
    expect(necesitaRehash(`$2a$${RONDAS_BCRYPT}$abcdefghijklmnopqrstuv`)).toBe(
      false,
    );
  });

  it("no toca un hash con MÁS rondas que las actuales", () => {
    expect(necesitaRehash("$2a$15$abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("ante un formato desconocido no hace nada", () => {
    // Mejor dejar quieto un hash que no se entiende que arriesgar dejar a
    // alguien sin poder entrar.
    expect(necesitaRehash("no-es-un-hash")).toBe(false);
    expect(necesitaRehash("")).toBe(false);
    expect(necesitaRehash("$2a$xx$abcdefghijklmnopqrstuv")).toBe(false);
  });
});

describe("RONDAS_BCRYPT", () => {
  it("está en el rango sano", () => {
    expect(RONDAS_BCRYPT).toBeGreaterThanOrEqual(10);
    expect(RONDAS_BCRYPT).toBeLessThanOrEqual(15);
  });
});

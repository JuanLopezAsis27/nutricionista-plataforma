import { describe, it, expect } from "vitest";
import { CifradorTokens } from "./CifradorTokens";

const SECRETO = "un-secreto-de-prueba-suficientemente-largo-1234567890";

describe("CifradorTokens", () => {
  it("cifra y descifra recuperando el texto original", () => {
    const cifrador = new CifradorTokens(SECRETO);
    const token = "ya29.a0AfH6-token-de-acceso-google";

    const cifrado = cifrador.cifrar(token);
    expect(cifrado).not.toContain(token);
    expect(cifrador.descifrar(cifrado)).toBe(token);
  });

  it("produce cifrados distintos para el mismo texto (IV aleatorio)", () => {
    const cifrador = new CifradorTokens(SECRETO);
    expect(cifrador.cifrar("hola")).not.toBe(cifrador.cifrar("hola"));
  });

  it("falla al descifrar un token manipulado", () => {
    const cifrador = new CifradorTokens(SECRETO);
    const cifrado = cifrador.cifrar("secreto");
    const [iv, tag, datos] = cifrado.split(".");
    const manipulado = [iv, tag, Buffer.from("otracosa").toString("base64")].join(".");

    expect(() => cifrador.descifrar(manipulado)).toThrow();
  });

  it("no descifra con otro secreto", () => {
    const cifrado = new CifradorTokens(SECRETO).cifrar("secreto");
    const otro = new CifradorTokens("otro-secreto-completamente-distinto-0987654321");
    expect(() => otro.descifrar(cifrado)).toThrow();
  });

  it("rechaza un secreto ausente o demasiado corto", () => {
    expect(() => new CifradorTokens(undefined)).toThrow();
    expect(() => new CifradorTokens("corto")).toThrow();
  });
});

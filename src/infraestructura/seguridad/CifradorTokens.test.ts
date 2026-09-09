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
    const [iv, tag] = cifrado.split(".");
    const manipulado = [
      iv,
      tag,
      Buffer.from("otracosa").toString("base64"),
    ].join(".");

    expect(() => cifrador.descifrar(manipulado)).toThrow();
  });

  it("no descifra con otro secreto", () => {
    const cifrado = new CifradorTokens(SECRETO).cifrar("secreto");
    const otro = new CifradorTokens(
      "otro-secreto-completamente-distinto-0987654321",
    );
    expect(() => otro.descifrar(cifrado)).toThrow();
  });

  it("rechaza un secreto demasiado corto", () => {
    expect(() => new CifradorTokens("corto")).toThrow();
  });

  // El constructor toma `process.env.TOKENS_SECRET` como valor POR DEFECTO, y en
  // JavaScript pasar `undefined` es justamente lo que activa ese defecto. Por eso
  // este caso no puede limitarse a `new CifradorTokens(undefined)`: hay que
  // asegurarse de que la variable no esté definida, o el test comprueba el
  // entorno en vez del código.
  //
  // Asumirlo es lo que hacía antes, y funcionaba sólo porque vitest no carga
  // `.env`. En el CI, que sí define TOKENS_SECRET para el resto de los pasos, el
  // constructor encontraba un secreto válido, no lanzaba, y el test fallaba.
  it("rechaza un secreto ausente (sin TOKENS_SECRET en el entorno)", () => {
    const previo = process.env.TOKENS_SECRET;
    delete process.env.TOKENS_SECRET;
    try {
      expect(() => new CifradorTokens(undefined)).toThrow();
      expect(() => new CifradorTokens()).toThrow();
    } finally {
      if (previo === undefined) {
        delete process.env.TOKENS_SECRET;
      } else {
        process.env.TOKENS_SECRET = previo;
      }
    }
  });

  // La contracara: si la variable está definida y es válida, el constructor sin
  // argumentos tiene que tomarla. Sin este caso, el arreglo de arriba podría
  // pasar aunque el valor por defecto dejara de funcionar.
  it("usa TOKENS_SECRET del entorno cuando no se pasa argumento", () => {
    const previo = process.env.TOKENS_SECRET;
    process.env.TOKENS_SECRET = SECRETO;
    try {
      const cifrador = new CifradorTokens();
      expect(cifrador.descifrar(cifrador.cifrar("hola"))).toBe("hola");
    } finally {
      if (previo === undefined) {
        delete process.env.TOKENS_SECRET;
      } else {
        process.env.TOKENS_SECRET = previo;
      }
    }
  });
});

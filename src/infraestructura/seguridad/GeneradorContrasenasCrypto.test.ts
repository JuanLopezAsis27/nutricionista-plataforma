import { describe, it, expect } from "vitest";
import { GeneradorContrasenasCrypto } from "./GeneradorContrasenasCrypto";
import { passwordNuevaDto } from "@/aplicacion/dtos/password";

describe("GeneradorContrasenasCrypto", () => {
  it("genera contraseñas que cumplen la política de la app", () => {
    const generador = new GeneradorContrasenasCrypto();
    for (let i = 0; i < 50; i++) {
      expect(passwordNuevaDto.safeParse(generador.generar()).success).toBe(
        true,
      );
    }
  });

  it("no usa caracteres que se confunden al leerlos (0/O, 1/l/I)", () => {
    const generador = new GeneradorContrasenasCrypto();
    for (let i = 0; i < 50; i++) {
      expect(generador.generar()).not.toMatch(/[0O1lIo]/);
    }
  });

  it("no repite: cada envío lleva una distinta", () => {
    const generador = new GeneradorContrasenasCrypto();
    const vistas = new Set(
      Array.from({ length: 100 }, () => generador.generar()),
    );
    expect(vistas.size).toBe(100);
  });
});

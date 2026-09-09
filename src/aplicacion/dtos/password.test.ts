import { describe, it, expect } from "vitest";
import { passwordNuevaDto, LARGO_MINIMO_PASSWORD } from "./password";
import { restablecerPasswordDto } from "./autenticacion.dto";
import { crearCuentaNutricionistaDto } from "./superadmin.dto";

describe("passwordNuevaDto", () => {
  it("acepta una contraseña de largo suficiente", () => {
    expect(passwordNuevaDto.safeParse("caballo-bateria-grapa").success).toBe(
      true,
    );
  });

  it("rechaza por debajo del mínimo", () => {
    expect(passwordNuevaDto.safeParse("corta1").success).toBe(false);
    expect(
      passwordNuevaDto.safeParse("a".repeat(LARGO_MINIMO_PASSWORD - 1)).success,
    ).toBe(false);
  });

  it("rechaza por encima del máximo que bcrypt puede usar", () => {
    // bcrypt trunca en 72 bytes: aceptar más sería mentir sobre la fuerza.
    expect(passwordNuevaDto.safeParse("a".repeat(73)).success).toBe(false);
  });

  it("rechaza un solo carácter repetido aunque cumpla el largo", () => {
    expect(passwordNuevaDto.safeParse("aaaaaaaaaaaaaa").success).toBe(false);
  });

  it("rechaza las contraseñas obvias, sin distinguir mayúsculas", () => {
    expect(passwordNuevaDto.safeParse("cambiar123456").success).toBe(false);
    expect(passwordNuevaDto.safeParse("Cambiar123456").success).toBe(false);
    expect(passwordNuevaDto.safeParse("NUTRICIONISTA").success).toBe(false);
  });
});

describe("la política es la MISMA en todos los flujos", () => {
  // Esta es la regresión que importa: antes el alta pedía 8 y el
  // restablecimiento 6, así que "olvidé mi contraseña" servía para rebajar la
  // política por la puerta de atrás.
  const debil = "clave1";

  it("el alta de cuenta la rechaza", () => {
    expect(
      crearCuentaNutricionistaDto.safeParse({
        email: "nutri@mail.com",
        password: debil,
      }).success,
    ).toBe(false);
  });

  it("el restablecimiento la rechaza igual", () => {
    expect(
      restablecerPasswordDto.safeParse({ token: "t", password: debil }).success,
    ).toBe(false);
  });

  it("y las dos aceptan la misma contraseña buena", () => {
    const buena = "melon-tractor-lunes";
    expect(
      crearCuentaNutricionistaDto.safeParse({
        email: "nutri@mail.com",
        password: buena,
      }).success,
    ).toBe(true);
    expect(
      restablecerPasswordDto.safeParse({ token: "t", password: buena }).success,
    ).toBe(true);
  });
});

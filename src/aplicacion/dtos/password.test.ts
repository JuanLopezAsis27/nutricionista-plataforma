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

  it("acepta justo el mínimo y rechaza un carácter menos", () => {
    // El borde importa: el mínimo bajó de 12 a 8 y este es el test que dice
    // cuál es el valor vigente sin tener que leer el DTO.
    expect(LARGO_MINIMO_PASSWORD).toBe(8);
    expect(passwordNuevaDto.safeParse("melon-58").success).toBe(true);
    expect(passwordNuevaDto.safeParse("melon-5").success).toBe(false);
  });

  it("rechaza por debajo del mínimo", () => {
    expect(passwordNuevaDto.safeParse("corta1").success).toBe(false);
    expect(
      passwordNuevaDto.safeParse("a".repeat(LARGO_MINIMO_PASSWORD - 1)).success,
    ).toBe(false);
  });

  it("rechaza las obvias que antes frenaba solo el largo", () => {
    // Con el mínimo en 12, `password` y `12345678` no llegaban a la lista de
    // prohibidas: los rechazaba el largo. Al bajar a 8 pasaron a ser válidas
    // por forma, así que la lista tiene que nombrarlas.
    expect(passwordNuevaDto.safeParse("password").success).toBe(false);
    expect(passwordNuevaDto.safeParse("12345678").success).toBe(false);
    expect(passwordNuevaDto.safeParse("Qwerty123").success).toBe(false);
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

import { describe, it, expect, vi } from "vitest";
import { CrearCuentaNutricionista } from "./CrearCuentaNutricionista";
import { Usuario } from "../../entidades/Usuario";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockUsuarioRepositorio,
  mockHasheador,
  mockNutricionistaRepositorio,
} from "../_ayudas-test";

describe("CrearCuentaNutricionista", () => {
  it("crea el nutricionista como su propio inquilino y aprovisiona sus datos", async () => {
    const crear = vi.fn(async (u: Usuario) => u);
    const aprovisionar = vi.fn(async () => {});
    const nutricionistas = mockNutricionistaRepositorio();
    const uc = new CrearCuentaNutricionista(
      mockUsuarioRepositorio({
        obtenerPorEmail: vi.fn(async () => null),
        crear,
      }),
      mockHasheador(),
      { aprovisionar },
      nutricionistas,
    );

    const usuario = await uc.ejecutar({
      email: "nuevo@consultorio.com",
      password: "clave1234",
    });

    expect(usuario.esNutricionista).toBe(true);
    expect(usuario.nutricionistaId).toBe(usuario.id); // self-tenant
    expect(aprovisionar).toHaveBeenCalledWith(usuario.id);
    // La fila del inquilino tiene que existir antes que su usuario: es la FK.
    expect(nutricionistas.crear).toHaveBeenCalledWith(usuario.id);
  });

  it("rechaza un email ya usado", async () => {
    const existente = Usuario.crear(
      {
        email: "ocupado@consultorio.com",
        passwordHash: "hash:x",
        rol: "NUTRICIONISTA",
        nutricionistaId: "otro",
      },
      "otro",
    );

    await expect(
      new CrearCuentaNutricionista(
        mockUsuarioRepositorio({
          obtenerPorEmail: vi.fn(async () => existente),
        }),
        mockHasheador(),
        { aprovisionar: vi.fn(async () => {}) },
        mockNutricionistaRepositorio(),
      ).ejecutar({ email: "ocupado@consultorio.com", password: "clave1234" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

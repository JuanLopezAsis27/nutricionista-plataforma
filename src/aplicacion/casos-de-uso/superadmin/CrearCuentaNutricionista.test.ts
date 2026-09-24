import { describe, it, expect, vi } from "vitest";
import { CrearCuentaNutricionista } from "./CrearCuentaNutricionista";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
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
      nombre: "  Lic. Ana Gómez ",
      email: "nuevo@consultorio.com",
      password: "clave1234",
    });

    expect(usuario.esNutricionista).toBe(true);
    expect(usuario.nutricionistaId).toBe(usuario.id); // self-tenant
    expect(aprovisionar).toHaveBeenCalledWith(usuario.id);
    // La fila del inquilino tiene que existir antes que su usuario: es la FK.
    // Y nace con el nombre, sin espacios de más: no hay inquilino sin nombre.
    expect(nutricionistas.crear).toHaveBeenCalledWith(
      usuario.id,
      "Lic. Ana Gómez",
    );
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
      ).ejecutar({
        nombre: "Lic. Ana Gómez",
        email: "ocupado@consultorio.com",
        password: "clave1234",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("rechaza el alta sin nombre antes de crear nada", async () => {
    const nutricionistas = mockNutricionistaRepositorio();
    const aprovisionar = vi.fn(async () => {});

    await expect(
      new CrearCuentaNutricionista(
        mockUsuarioRepositorio({ obtenerPorEmail: vi.fn(async () => null) }),
        mockHasheador(),
        { aprovisionar },
        nutricionistas,
      ).ejecutar({
        nombre: "   ",
        email: "nuevo@consultorio.com",
        password: "clave1234",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(nutricionistas.crear).not.toHaveBeenCalled();
    expect(aprovisionar).not.toHaveBeenCalled();
  });
});

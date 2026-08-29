import { describe, it, expect, vi } from "vitest";
import { GuardarConfiguracion } from "./GuardarConfiguracion";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockConfiguracionRepositorio,
  configuracionEjemplo,
} from "../_ayudas-test";

describe("GuardarConfiguracion", () => {
  it("aplica los cambios sobre la configuración actual y la persiste", async () => {
    const guardar = vi.fn(async (c) => c);
    const repo = mockConfiguracionRepositorio({
      obtener: vi.fn(async () => configuracionEjemplo()),
      guardar,
    });

    const resultado = await new GuardarConfiguracion(repo).ejecutar({
      turnoDuracionMinutos: 45,
    });

    expect(resultado.aPrimitivos().turnoDuracionMinutos).toBe(45);
    expect(guardar).toHaveBeenCalledOnce();
  });

  it("parte de la configuración por defecto si todavía no existe ninguna", async () => {
    const repo = mockConfiguracionRepositorio({
      obtener: vi.fn(async () => null),
    });

    const resultado = await new GuardarConfiguracion(repo).ejecutar({
      nombreProfesional: "Lic. López Asis",
    });

    expect(resultado.aPrimitivos().nombreProfesional).toBe("Lic. López Asis");
    expect(resultado.aPrimitivos().turnoDuracionMinutos).toBe(30); // default intacto
  });

  it("rechaza una duración de turno fuera de rango", async () => {
    const repo = mockConfiguracionRepositorio({
      obtener: vi.fn(async () => configuracionEjemplo()),
    });

    await expect(
      new GuardarConfiguracion(repo).ejecutar({ turnoDuracionMinutos: 1000 }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

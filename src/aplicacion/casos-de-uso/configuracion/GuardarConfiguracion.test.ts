import { describe, it, expect, vi } from "vitest";
import { GuardarConfiguracion } from "./GuardarConfiguracion";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
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
      matricula: "M.N. 1234",
    });

    expect(resultado.aPrimitivos().matricula).toBe("M.N. 1234");
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
    expect(resultado.aPrimitivos().pdfMostrarRecetas).toBe(true); // default intacto
  });

  it("rechaza un color de PDF que no es hexadecimal", async () => {
    const repo = mockConfiguracionRepositorio({
      obtener: vi.fn(async () => configuracionEjemplo()),
    });

    await expect(
      new GuardarConfiguracion(repo).ejecutar({ pdfColorPrimario: "coral" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

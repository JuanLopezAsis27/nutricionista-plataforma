import { describe, it, expect, vi } from "vitest";
import { EnviarBienvenidaMasiva } from "./EnviarBienvenidaMasiva";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockPlantillaEmailRepositorio,
  mockServicioEmail,
  pacienteEjemplo,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

function armarEnviarUno() {
  return new EnviarEmailDeBienvenida(
    mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo()),
    }),
    mockServicioEmail(),
    "Lic. Marta",
  );
}

describe("EnviarBienvenidaMasiva", () => {
  it("rechaza un lote vacío", async () => {
    const caso = new EnviarBienvenidaMasiva(
      mockPacienteRepositorio(),
      armarEnviarUno(),
    );

    await expect(caso.ejecutar({ pacienteIds: [] })).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });

  it("manda y marca a quien todavía no la tenía enviada", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const caso = new EnviarBienvenidaMasiva(pacientes, armarEnviarUno());

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

    expect(resultado.enviados).toBe(1);
    expect(resultado.detalles[0]!.estado).toBe("ENVIADO");
    expect(pacientes.actualizar).toHaveBeenCalledOnce();
  });

  it("omite —sin remandar— a quien ya la tenía enviada, salvo que se fuerce", async () => {
    const yaEnviada = pacienteEjemplo().marcarBienvenidaEnviada(
      new Date("2026-01-01T00:00:00Z"),
    );
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => yaEnviada),
    });
    const caso = new EnviarBienvenidaMasiva(pacientes, armarEnviarUno());

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-1"] });

    expect(resultado.omitidos).toBe(1);
    expect(pacientes.actualizar).not.toHaveBeenCalled();
  });

  it("con `forzar` remanda aunque ya estuviera enviada", async () => {
    const yaEnviada = pacienteEjemplo().marcarBienvenidaEnviada(
      new Date("2026-01-01T00:00:00Z"),
    );
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => yaEnviada),
    });
    const caso = new EnviarBienvenidaMasiva(pacientes, armarEnviarUno());

    const resultado = await caso.ejecutar({
      pacienteIds: ["pac-1"],
      forzar: true,
    });

    expect(resultado.enviados).toBe(1);
  });

  it("marca como fallido a un paciente que ya no existe, sin frenar el resto", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const caso = new EnviarBienvenidaMasiva(pacientes, armarEnviarUno());

    const resultado = await caso.ejecutar({ pacienteIds: ["pac-inexistente"] });

    expect(resultado.fallidos).toBe(1);
    expect(resultado.detalles[0]!.estado).toBe("FALLIDO");
  });
});

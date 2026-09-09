import { describe, it, expect, vi } from "vitest";
import { ObtenerRegistrosEnRango } from "./ObtenerRegistrosEnRango";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

describe("ObtenerRegistrosEnRango", () => {
  it("devuelve los registros del rango", async () => {
    const casoUso = new ObtenerRegistrosEnRango(
      mockRegistroDiarioRepositorio({
        listarPorRango: vi.fn(async () => [registroDiarioEjemplo()]),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const registros = await casoUso.ejecutar(
      "pac-1",
      new Date("2026-07-01"),
      new Date("2026-07-14"),
    );

    expect(registros).toHaveLength(1);
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerRegistrosEnRango(
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar(
        "no-existe",
        new Date("2026-07-01"),
        new Date("2026-07-14"),
      ),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza un rango invertido", async () => {
    const casoUso = new ObtenerRegistrosEnRango(
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );
    await expect(
      casoUso.ejecutar("pac-1", new Date("2026-07-14"), new Date("2026-07-01")),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

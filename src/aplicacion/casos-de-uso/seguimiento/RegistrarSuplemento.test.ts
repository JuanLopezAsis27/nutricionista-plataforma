import { describe, it, expect, vi } from "vitest";
import { RegistrarSuplemento } from "./RegistrarSuplemento";
import { Suplemento } from "@/dominio/entidades/Suplemento";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockSuplementoRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("RegistrarSuplemento", () => {
  it("indica un suplemento a un paciente existente", async () => {
    const suplementos = mockSuplementoRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarSuplemento(suplementos, pacientes);

    const suplemento = await casoUso.ejecutar({
      pacienteId: "pac-1",
      nombre: "Omega 3",
      dosis: "2 cápsulas",
    });

    expect(suplemento).toBeInstanceOf(Suplemento);
    expect(suplemento.activo).toBe(true);
    expect(suplementos.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new RegistrarSuplemento(
      mockSuplementoRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "inexistente", nombre: "Omega 3" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("lanza ErrorValidacion si la vigencia está invertida", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarSuplemento(
      mockSuplementoRepositorio(),
      pacientes,
    );

    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        nombre: "Creatina",
        desde: new Date("2026-08-01"),
        hasta: new Date("2026-07-01"),
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

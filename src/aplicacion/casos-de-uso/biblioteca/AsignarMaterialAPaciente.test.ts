import { describe, it, expect, vi } from "vitest";
import { AsignarMaterialAPaciente } from "./AsignarMaterialAPaciente";
import { ErrorMaterialNoEncontrado } from "@/dominio/errores/ErrorMaterialNoEncontrado";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockMaterialRepositorio,
  mockPacienteRepositorio,
  materialEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const datos = { materialId: "mat-1", pacienteId: "pac-1" };

describe("AsignarMaterialAPaciente", () => {
  it("comparte el material con el paciente", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarMaterialAPaciente(materiales, pacientes);

    await casoUso.ejecutar(datos);

    expect(materiales.asignarAPaciente).toHaveBeenCalledWith(
      "mat-1",
      "pac-1",
      expect.any(String),
    );
  });

  it("lanza ErrorMaterialNoEncontrado si el material no existe", async () => {
    const casoUso = new AsignarMaterialAPaciente(
      mockMaterialRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorMaterialNoEncontrado,
    );
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const casoUso = new AsignarMaterialAPaciente(
      materiales,
      mockPacienteRepositorio(),
    );

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(materiales.asignarAPaciente).not.toHaveBeenCalled();
  });
});

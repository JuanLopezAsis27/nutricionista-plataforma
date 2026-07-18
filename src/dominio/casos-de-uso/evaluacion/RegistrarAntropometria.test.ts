import { describe, it, expect, vi } from "vitest";
import { RegistrarAntropometria } from "./RegistrarAntropometria";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorAntropometriaDuplicada } from "../../errores/ErrorAntropometriaDuplicada";
import {
  mockAntropometriaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

const DATOS = {
  pacienteId: "pac-1",
  fecha: new Date("2026-07-01"),
  pesoKg: 81.3,
};

describe("RegistrarAntropometria", () => {
  it("registra la medición del paciente", async () => {
    const antropometrias = mockAntropometriaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarAntropometria(antropometrias, pacientes);

    const medicion = await casoUso.ejecutar(DATOS);

    expect(medicion.pesoKg).toBe(81.3);
    expect(antropometrias.crear).toHaveBeenCalledOnce();
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new RegistrarAntropometria(
      mockAntropometriaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar(DATOS)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });

  it("rechaza una segunda medición en la misma fecha", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      existeEnFecha: vi.fn(async () => true),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarAntropometria(antropometrias, pacientes);

    await expect(casoUso.ejecutar(DATOS)).rejects.toBeInstanceOf(
      ErrorAntropometriaDuplicada,
    );
    expect(antropometrias.crear).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { ObtenerObjetivosDePaciente } from "./ObtenerObjetivosDePaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockObjetivoRepositorio,
  mockPacienteRepositorio,
  objetivoEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("ObtenerObjetivosDePaciente", () => {
  it("devuelve los objetivos del paciente", async () => {
    const objetivos = mockObjetivoRepositorio({
      listarPorPaciente: vi.fn(async () => [objetivoEjemplo()]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerObjetivosDePaciente(objetivos, pacientes);

    const resultado = await casoUso.ejecutar("pac-1");

    expect(resultado).toHaveLength(1);
    expect(objetivos.listarPorPaciente).toHaveBeenCalledWith("pac-1");
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new ObtenerObjetivosDePaciente(
      mockObjetivoRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("nadie")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

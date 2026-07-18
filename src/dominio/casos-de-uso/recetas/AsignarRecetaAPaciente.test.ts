import { describe, it, expect, vi } from "vitest";
import { AsignarRecetaAPaciente } from "./AsignarRecetaAPaciente";
import { ErrorRecetaNoEncontrada } from "../../errores/ErrorRecetaNoEncontrada";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockRecetaRepositorio,
  mockPacienteRepositorio,
  recetaEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const datos = { recetaId: "rec-1", pacienteId: "pac-1" };

describe("AsignarRecetaAPaciente", () => {
  it("comparte la receta con el paciente", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarRecetaAPaciente(recetas, pacientes);

    await casoUso.ejecutar(datos);

    expect(recetas.asignarAPaciente).toHaveBeenCalledWith(
      "rec-1",
      "pac-1",
      expect.any(String),
    );
  });

  it("lanza ErrorRecetaNoEncontrada si la receta no existe", async () => {
    const recetas = mockRecetaRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new AsignarRecetaAPaciente(recetas, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorRecetaNoEncontrada);
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const pacientes = mockPacienteRepositorio();
    const casoUso = new AsignarRecetaAPaciente(recetas, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(recetas.asignarAPaciente).not.toHaveBeenCalled();
  });
});

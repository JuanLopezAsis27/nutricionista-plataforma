import { describe, it, expect, vi } from "vitest";
import { AsignarDietaAPaciente } from "./AsignarDietaAPaciente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";
import {
  mockDietaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  dietaEjemplo,
} from "../_ayudas-test";

const datos = {
  dietaId: "die-1",
  pacienteId: "pac-1",
  fechaInicio: new Date("2026-07-01"),
  fechaFin: null,
};

describe("AsignarDietaAPaciente", () => {
  it("desactiva la asignación previa y crea una nueva activa", async () => {
    const dietas = mockDietaRepositorio({
      obtenerPorId: vi.fn(async () => dietaEjemplo()),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarDietaAPaciente(dietas, pacientes);

    const asignacion = await casoUso.ejecutar(datos);

    expect(dietas.desactivarAsignacionesDe).toHaveBeenCalledWith("pac-1");
    expect(dietas.asignarAPaciente).toHaveBeenCalledOnce();
    expect(asignacion.activa).toBe(true);
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const dietas = mockDietaRepositorio();
    const pacientes = mockPacienteRepositorio();
    const casoUso = new AsignarDietaAPaciente(dietas, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(dietas.desactivarAsignacionesDe).not.toHaveBeenCalled();
  });

  it("lanza ErrorDietaNoEncontrada si la dieta no existe", async () => {
    const dietas = mockDietaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new AsignarDietaAPaciente(dietas, pacientes);

    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorDietaNoEncontrada);
  });
});

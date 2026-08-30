import { describe, it, expect, vi } from "vitest";
import { GuardarHistoriaClinica } from "./GuardarHistoriaClinica";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockHistoriaClinicaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  historiaClinicaEjemplo,
} from "../_ayudas-test";

describe("GuardarHistoriaClinica", () => {
  it("crea la historia si el paciente no tenía", async () => {
    const historias = mockHistoriaClinicaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarHistoriaClinica(historias, pacientes);

    const historia = await casoUso.ejecutar({
      pacienteId: "pac-1",
      motivoConsulta: "Descenso de peso",
    });

    expect(historia.pacienteId).toBe("pac-1");
    expect(historias.guardar).toHaveBeenCalledOnce();
  });

  it("actualiza la historia existente preservando su id", async () => {
    const existente = historiaClinicaEjemplo();
    const historias = mockHistoriaClinicaRepositorio({
      obtenerPorPaciente: vi.fn(async () => existente),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarHistoriaClinica(historias, pacientes);

    const historia = await casoUso.ejecutar({
      pacienteId: "pac-1",
      medicacion: "Levotiroxina 50 mcg",
    });

    expect(historia.id).toBe(existente.id);
    expect(historia.aPrimitivos().medicacion).toBe("Levotiroxina 50 mcg");
    // Los campos previos no informados se conservan.
    expect(historia.aPrimitivos().motivoConsulta).toBe("Descenso de peso");
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new GuardarHistoriaClinica(
      mockHistoriaClinicaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "no-existe", motivoConsulta: "x" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza una historia completamente vacía", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarHistoriaClinica(
      mockHistoriaClinicaRepositorio(),
      pacientes,
    );
    await expect(
      casoUso.ejecutar({ pacienteId: "pac-1" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

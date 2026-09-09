import { describe, it, expect, vi } from "vitest";
import { RegistrarAlertaAlimentaria } from "./RegistrarAlertaAlimentaria";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockAlertaAlimentariaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("RegistrarAlertaAlimentaria", () => {
  it("registra la alerta con severidad por defecto MODERADA", async () => {
    const alertas = mockAlertaAlimentariaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarAlertaAlimentaria(alertas, pacientes);

    const alerta = await casoUso.ejecutar({
      pacienteId: "pac-1",
      tipo: "ALERGIA",
      descripcion: "Maní",
    });

    expect(alerta.severidad).toBe("MODERADA");
    expect(alertas.crear).toHaveBeenCalledOnce();
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new RegistrarAlertaAlimentaria(
      mockAlertaAlimentariaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar({
        pacienteId: "no-existe",
        tipo: "ALERGIA",
        descripcion: "Maní",
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("rechaza una alerta sin descripción", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new RegistrarAlertaAlimentaria(
      mockAlertaAlimentariaRepositorio(),
      pacientes,
    );
    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        tipo: "ALERGIA",
        descripcion: "  ",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

import { describe, it, expect, vi } from "vitest";
import { GuardarDia } from "./GuardarDia";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

const DATOS = {
  pacienteId: "pac-1",
  fecha: new Date("2026-07-10"),
  pesoKg: 78.5,
};

describe("GuardarDia", () => {
  it("crea el registro si el día no existía", async () => {
    const registros = mockRegistroDiarioRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarDia(registros, pacientes);

    const registro = await casoUso.ejecutar(DATOS);

    expect(registro.aPrimitivos().pesoKg).toBe(78.5);
    expect(registros.crear).toHaveBeenCalledOnce();
    expect(registros.actualizarEscalares).not.toHaveBeenCalled();
  });

  it("actualiza solo los escalares informados si el día ya existía", async () => {
    const existente = registroDiarioEjemplo({ pesoKg: 78.5, aguaMl: 1500 });
    const registros = mockRegistroDiarioRepositorio({
      obtenerPorPacienteYFecha: vi.fn(async () => existente),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarDia(registros, pacientes);

    const registro = await casoUso.ejecutar({
      pacienteId: "pac-1",
      fecha: new Date("2026-07-10"),
      aguaMl: 2000,
    });

    expect(registro.aPrimitivos().aguaMl).toBe(2000);
    expect(registro.aPrimitivos().pesoKg).toBe(78.5); // se preserva
    expect(registros.actualizarEscalares).toHaveBeenCalledOnce();
    expect(registros.crear).not.toHaveBeenCalled();
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new GuardarDia(
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar(DATOS)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });

  it("rechaza valores fuera de rango (agua negativa)", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new GuardarDia(mockRegistroDiarioRepositorio(), pacientes);
    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        fecha: new Date("2026-07-10"),
        aguaMl: -1,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

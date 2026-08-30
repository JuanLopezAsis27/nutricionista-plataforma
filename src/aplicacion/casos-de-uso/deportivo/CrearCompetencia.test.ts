import { describe, it, expect, vi } from "vitest";
import { CrearCompetencia } from "./CrearCompetencia";
import { ActualizarCompetencia } from "./ActualizarCompetencia";
import { Competencia } from "@/dominio/entidades/Competencia";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorCompetenciaNoEncontrada } from "@/dominio/errores/ErrorCompetenciaNoEncontrada";
import {
  mockCompetenciaRepositorio,
  mockPacienteRepositorio,
  competenciaEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("CrearCompetencia", () => {
  it("crea la competencia para un paciente del inquilino", async () => {
    const competencias = mockCompetenciaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const uc = new CrearCompetencia(competencias, pacientes);

    const c = await uc.ejecutar({
      pacienteId: "pac-1",
      nombre: "10K nocturna",
      fecha: new Date("2026-10-01"),
    });

    expect(c).toBeInstanceOf(Competencia);
    expect(competencias.crear).toHaveBeenCalledOnce();
  });

  it("falla si el paciente no es del inquilino (guard)", async () => {
    const competencias = mockCompetenciaRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const uc = new CrearCompetencia(competencias, pacientes);

    await expect(
      uc.ejecutar({
        pacienteId: "ajeno",
        nombre: "x",
        fecha: new Date("2026-10-01"),
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(competencias.crear).not.toHaveBeenCalled();
  });
});

describe("ActualizarCompetencia", () => {
  it("edita una competencia existente conservando id y paciente", async () => {
    const existente = competenciaEjemplo({ nombre: "vieja" }, "com-7");
    const actualizar = vi.fn(async (c: Competencia) => c);
    const competencias = mockCompetenciaRepositorio({
      obtenerPorId: vi.fn(async () => existente),
      actualizar,
    });
    const uc = new ActualizarCompetencia(competencias);

    await uc.ejecutar({
      id: "com-7",
      nombre: "nueva",
      fecha: new Date("2026-11-01"),
    });

    const guardada = actualizar.mock.calls[0]![0].aPrimitivos();
    expect(guardada.id).toBe("com-7");
    expect(guardada.pacienteId).toBe("pac-1");
    expect(guardada.nombre).toBe("nueva");
  });

  it("falla si la competencia no existe", async () => {
    const competencias = mockCompetenciaRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });
    const uc = new ActualizarCompetencia(competencias);

    await expect(
      uc.ejecutar({ id: "x", nombre: "y", fecha: new Date("2026-11-01") }),
    ).rejects.toBeInstanceOf(ErrorCompetenciaNoEncontrada);
  });
});

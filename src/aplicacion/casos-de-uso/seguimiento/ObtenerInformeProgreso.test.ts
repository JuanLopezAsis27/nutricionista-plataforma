import { describe, it, expect, vi } from "vitest";
import { ObtenerInformeProgreso } from "./ObtenerInformeProgreso";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockAntropometriaRepositorio,
  mockRegistroDiarioRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  antropometriaEjemplo,
  registroDiarioEjemplo,
} from "../_ayudas-test";

const desde = new Date("2026-06-01");
const hasta = new Date("2026-07-14");

describe("ObtenerInformeProgreso", () => {
  it("mezcla peso de consulta y autoreportado en una serie ordenada", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      // 2026-07-01, peso 80 (dentro del rango)
      listarPorPaciente: vi.fn(async () => [antropometriaEjemplo()]),
    });
    const registros = mockRegistroDiarioRepositorio({
      // 2026-07-10, peso 78.5
      listarPorRango: vi.fn(async () => [registroDiarioEjemplo()]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerInformeProgreso(
      antropometrias,
      registros,
      pacientes,
    );

    const informe = await casoUso.ejecutar("pac-1", desde, hasta);

    expect(informe.puntos).toHaveLength(2);
    expect(informe.puntos[0]!.pesoConsulta).toBe(80);
    expect(informe.puntos[1]!.pesoDiario).toBe(78.5);
    expect(informe.pesoInicial).toBe(80);
    expect(informe.pesoActual).toBe(78.5);
    expect(informe.variacionKg).toBe(-1.5);
  });

  it("descarta mediciones fuera del rango", async () => {
    const antropometrias = mockAntropometriaRepositorio({
      listarPorPaciente: vi.fn(async () => [antropometriaEjemplo()]), // 2026-07-01
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const casoUso = new ObtenerInformeProgreso(
      antropometrias,
      mockRegistroDiarioRepositorio(),
      pacientes,
    );

    const informe = await casoUso.ejecutar(
      "pac-1",
      new Date("2026-01-01"),
      new Date("2026-02-01"),
    );

    expect(informe.puntos).toHaveLength(0);
    expect(informe.variacionKg).toBeNull();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const casoUso = new ObtenerInformeProgreso(
      mockAntropometriaRepositorio(),
      mockRegistroDiarioRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(
      casoUso.ejecutar("inexistente", desde, hasta),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });
});

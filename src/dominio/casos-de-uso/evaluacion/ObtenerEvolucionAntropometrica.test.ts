import { describe, it, expect, vi } from "vitest";
import { ObtenerEvolucionAntropometrica } from "./ObtenerEvolucionAntropometrica";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockAntropometriaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  antropometriaEjemplo,
} from "../_ayudas-test";

describe("ObtenerEvolucionAntropometrica", () => {
  it("devuelve las mediciones con sus derivados calculados", async () => {
    const mediciones = [
      antropometriaEjemplo({ fecha: new Date("2026-05-01"), pesoKg: 81.3 }, "ant-1"),
      antropometriaEjemplo({ fecha: new Date("2026-06-01"), pesoKg: 77.5 }, "ant-2"),
    ];
    const casoUso = new ObtenerEvolucionAntropometrica(
      mockAntropometriaRepositorio({
        listarPorPaciente: vi.fn(async () => mediciones),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => pacienteEjemplo()) }),
    );

    const evolucion = await casoUso.ejecutar("pac-1");

    expect(evolucion.mediciones).toHaveLength(2);
    expect(evolucion.derivados[1]?.kgBajadosVsAnterior).toBe(3.8);
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerEvolucionAntropometrica(
      mockAntropometriaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

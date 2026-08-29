import { describe, it, expect, vi } from "vitest";
import { RegistrarRetroalimentacionInsight } from "./RegistrarRetroalimentacionInsight";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockRetroalimentacionInsightRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

const datos = {
  pacienteId: "pac-1",
  tipoInsight: "RIESGO_ABANDONO",
  util: false,
  detalle: "82% de probabilidad — sin actividad hace 45 días",
};

describe("RegistrarRetroalimentacionInsight", () => {
  it("guarda la corrección si el paciente es del inquilino", async () => {
    const registrar = vi.fn(async () => {});
    const uc = new RegistrarRetroalimentacionInsight(
      mockRetroalimentacionInsightRepositorio({ registrar }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    await uc.ejecutar(datos);

    expect(registrar).toHaveBeenCalledWith(datos);
  });

  it("rechaza si el paciente no existe / no es del inquilino (guard)", async () => {
    const registrar = vi.fn(async () => {});
    const uc = new RegistrarRetroalimentacionInsight(
      mockRetroalimentacionInsightRepositorio({ registrar }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
    );

    await expect(uc.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(registrar).not.toHaveBeenCalled();
  });
});

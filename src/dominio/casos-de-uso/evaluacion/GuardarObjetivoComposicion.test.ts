import { describe, it, expect, vi } from "vitest";
import { GuardarObjetivoComposicion } from "./GuardarObjetivoComposicion";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockObjetivoComposicionRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  objetivoComposicionEjemplo,
} from "../_ayudas-test";

describe("GuardarObjetivoComposicion", () => {
  it("rechaza si el paciente no existe", async () => {
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio(),
    );

    await expect(
      casoUso.ejecutar({
        pacienteId: "no-existe",
        variable: "PESO",
        valorObjetivo: 70,
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });

  it("crea la meta cuando la variable todavía no tiene una", async () => {
    const objetivos = mockObjetivoComposicionRepositorio();
    const casoUso = new GuardarObjetivoComposicion(
      objetivos,
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "PESO",
      valorObjetivo: 70,
      fechaObjetivo: new Date("2026-12-01"),
    });

    expect(objetivo.variable).toBe("PESO");
    expect(objetivo.valorObjetivo).toBe(70);
    expect(objetivo.estado).toBe("EN_CURSO");
    expect(objetivos.guardar).toHaveBeenCalledOnce();
  });

  it("actualiza la meta existente en vez de crear una segunda", async () => {
    const existente = objetivoComposicionEjemplo({
      variable: "MASA_ADIPOSA_KG",
      valorObjetivo: 15,
    });
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio({
        obtenerPorVariable: vi.fn(async () => existente),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const objetivo = await casoUso.ejecutar({
      pacienteId: "pac-1",
      variable: "MASA_ADIPOSA_KG",
      valorObjetivo: 12,
    });

    // Mismo id: es la misma meta replanteada, no una nueva.
    expect(objetivo.id).toBe(existente.id);
    expect(objetivo.valorObjetivo).toBe(12);
  });

  it("rechaza un valor fuera del rango de la variable", async () => {
    const casoUso = new GuardarObjetivoComposicion(
      mockObjetivoComposicionRepositorio(),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    await expect(
      casoUso.ejecutar({
        pacienteId: "pac-1",
        variable: "INDICE_CINTURA_CADERA",
        valorObjetivo: 12,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

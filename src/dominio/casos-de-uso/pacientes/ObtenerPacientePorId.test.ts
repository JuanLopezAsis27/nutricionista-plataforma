import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientePorId } from "./ObtenerPacientePorId";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { mockPacienteRepositorio, pacienteEjemplo } from "../_ayudas-test";

describe("ObtenerPacientePorId", () => {
  it("devuelve el paciente cuando existe", async () => {
    const repositorio = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
    });
    const casoUso = new ObtenerPacientePorId(repositorio);

    const paciente = await casoUso.ejecutar("pac-1");

    expect(paciente.id).toBe("pac-1");
  });

  it("lanza ErrorPacienteNoEncontrado si no existe", async () => {
    const repositorio = mockPacienteRepositorio();
    const casoUso = new ObtenerPacientePorId(repositorio);

    await expect(casoUso.ejecutar("inexistente")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

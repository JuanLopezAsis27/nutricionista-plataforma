import { describe, it, expect, vi } from "vitest";
import { PreguntarAlAsistente } from "./PreguntarAlAsistente";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  mockPacienteRepositorio,
  mockObjetivoRepositorio,
  mockPlanRepositorio,
  mockAsistenteNutricional,
  mockHistorialIARepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("PreguntarAlAsistente", () => {
  it("arma el contexto, delega en el puerto y guarda la consulta", async () => {
    const responder = vi.fn(async () => "respuesta demo");
    const guardarConsulta = vi.fn(async () => {});
    const uc = new PreguntarAlAsistente(
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => pacienteEjemplo()) }),
      mockObjetivoRepositorio({ listarPorPaciente: vi.fn(async () => []) }),
      mockPlanRepositorio({ obtenerPlanActivoDePaciente: vi.fn(async () => null) }),
      mockAsistenteNutricional({ responder }),
      mockHistorialIARepositorio({ guardarConsulta }),
    );

    const resultado = await uc.ejecutar("pac-1", "¿Cuántas calorías tiene mi plan?");

    expect(resultado.respuesta).toBe("respuesta demo");
    expect(responder).toHaveBeenCalledWith(
      "¿Cuántas calorías tiene mi plan?",
      expect.objectContaining({ nombrePaciente: "Ana García", tienePlan: false }),
    );
    expect(guardarConsulta).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const uc = new PreguntarAlAsistente(
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockObjetivoRepositorio(),
      mockPlanRepositorio(),
      mockAsistenteNutricional(),
      mockHistorialIARepositorio(),
    );

    await expect(uc.ejecutar("x", "hola")).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });
});

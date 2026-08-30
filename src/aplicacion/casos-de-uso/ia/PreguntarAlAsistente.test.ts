import { describe, it, expect, vi } from "vitest";
import { PreguntarAlAsistente } from "./PreguntarAlAsistente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockPacienteRepositorio,
  mockObjetivoRepositorio,
  mockPlanRepositorio,
  mockRecetaRepositorio,
  mockAlertaAlimentariaRepositorio,
  mockAxiomaRepositorio,
  mockAsistenteNutricional,
  mockHistorialIARepositorio,
  mockPerfilDeportivoRepositorio,
  mockCompetenciaRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("PreguntarAlAsistente", () => {
  it("arma el contexto, delega en el puerto (con herramientas) y guarda la consulta", async () => {
    const responder = vi.fn(async () => "respuesta demo");
    const guardarConsulta = vi.fn(async () => {});
    const uc = new PreguntarAlAsistente(
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      mockObjetivoRepositorio({ listarPorPaciente: vi.fn(async () => []) }),
      mockPlanRepositorio({
        obtenerPlanActivoDePaciente: vi.fn(async () => null),
      }),
      mockRecetaRepositorio({ listarPorPaciente: vi.fn(async () => []) }),
      mockAlertaAlimentariaRepositorio({
        listarPorPaciente: vi.fn(async () => []),
      }),
      mockAxiomaRepositorio({ listarActivos: vi.fn(async () => []) }),
      mockAsistenteNutricional({ responder }),
      mockHistorialIARepositorio({ guardarConsulta }),
      mockPerfilDeportivoRepositorio(),
      mockCompetenciaRepositorio(),
    );

    const resultado = await uc.ejecutar(
      "pac-1",
      "¿Cuántas calorías tiene mi plan?",
    );

    expect(resultado.respuesta).toBe("respuesta demo");
    expect(responder).toHaveBeenCalledWith(
      "¿Cuántas calorías tiene mi plan?",
      expect.objectContaining({
        nombrePaciente: "Ana García",
        tienePlan: false,
      }),
      expect.arrayContaining([
        expect.objectContaining({ nombre: "obtener_plan_nutricional" }),
      ]),
    );
    expect(guardarConsulta).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const uc = new PreguntarAlAsistente(
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockObjetivoRepositorio(),
      mockPlanRepositorio(),
      mockRecetaRepositorio(),
      mockAlertaAlimentariaRepositorio(),
      mockAxiomaRepositorio(),
      mockAsistenteNutricional(),
      mockHistorialIARepositorio(),
      mockPerfilDeportivoRepositorio(),
      mockCompetenciaRepositorio(),
    );

    await expect(uc.ejecutar("x", "hola")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

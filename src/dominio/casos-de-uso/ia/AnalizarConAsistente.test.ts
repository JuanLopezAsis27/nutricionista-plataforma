import { describe, it, expect, vi } from "vitest";
import { AnalizarConAsistente } from "./AnalizarConAsistente";
import type { HerramientaAsistente } from "../../servicios/IAsistenteNutricional";
import {
  mockPacienteRepositorio,
  mockPlanRepositorio,
  mockRecetaRepositorio,
  mockTurnoRepositorio,
  mockObjetivoRepositorio,
  mockAlertaAlimentariaRepositorio,
  mockAsistenteAnalitico,
  pacienteEjemplo,
} from "../_ayudas-test";

function crear(
  overrides: {
    pacientes?: Parameters<typeof mockPacienteRepositorio>[0];
    responder?: (p: string, h: HerramientaAsistente[]) => Promise<string>;
  } = {},
) {
  const responder = vi.fn(overrides.responder ?? (async () => "análisis demo"));
  const uc = new AnalizarConAsistente(
    mockPacienteRepositorio(overrides.pacientes),
    mockPlanRepositorio(),
    mockRecetaRepositorio(),
    mockTurnoRepositorio(),
    mockObjetivoRepositorio(),
    mockAlertaAlimentariaRepositorio(),
    mockAsistenteAnalitico({ responder }),
  );
  return { uc, responder };
}

describe("AnalizarConAsistente", () => {
  it("delega en el asistente con la pregunta y un set de herramientas", async () => {
    const { uc, responder } = crear();

    const r = await uc.ejecutar("¿Cuántos pacientes tengo?");

    expect(r).toEqual({
      pregunta: "¿Cuántos pacientes tengo?",
      respuesta: "análisis demo",
    });
    expect(responder).toHaveBeenCalledOnce();
    const herramientas = responder.mock.calls[0]![1];
    expect(herramientas.map((h) => h.nombre)).toEqual(
      expect.arrayContaining([
        "listar_pacientes",
        "datos_de_paciente",
        "listar_planes",
        "listar_recetas",
        "proximos_turnos",
      ]),
    );
  });

  it("la herramienta listar_pacientes devuelve los pacientes del repositorio", async () => {
    const listar = vi.fn(async () => [pacienteEjemplo({}, "pac-1")]);
    // El "modelo" invoca la herramienta y devolvemos su salida como respuesta.
    const { uc } = crear({
      pacientes: { listar },
      responder: async (_p, herramientas) => {
        const tool = herramientas.find((h) => h.nombre === "listar_pacientes")!;
        return tool.ejecutar({});
      },
    });

    const r = await uc.ejecutar("listá mis pacientes");

    expect(listar).toHaveBeenCalledOnce();
    expect(r.respuesta).toContain("pac-1");
  });
});

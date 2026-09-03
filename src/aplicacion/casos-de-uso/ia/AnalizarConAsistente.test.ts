import { describe, it, expect, vi } from "vitest";
import { AnalizarConAsistente } from "./AnalizarConAsistente";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";
import type { TurnoAsistente } from "@/dominio/servicios/IAsistenteAnalitico";
import { ConversacionIA } from "@/dominio/entidades/ConversacionIA";
import {
  mockPacienteRepositorio,
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockRecetaRepositorio,
  mockTurnoRepositorio,
  mockObjetivoRepositorio,
  mockAlertaAlimentariaRepositorio,
  mockAsistenteAnalitico,
  mockConversacionIARepositorio,
  mockReloj,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-09-01T14:00:00Z");
/** Medianoche UTC del mismo día, que es como se guardan las fechas de turno. */
const HOY_UTC = new Date("2026-09-01T00:00:00Z");

function crear(
  overrides: {
    pacientes?: Parameters<typeof mockPacienteRepositorio>[0];
    turnos?: Parameters<typeof mockTurnoRepositorio>[0];
    asignaciones?: Parameters<typeof mockAsignacionPlanRepositorio>[0];
    conversaciones?: Parameters<typeof mockConversacionIARepositorio>[0];
    responder?: (
      m: TurnoAsistente[],
      h: HerramientaAsistente[],
      ahora: Date,
    ) => Promise<string>;
  } = {},
) {
  const responder = vi.fn(overrides.responder ?? (async () => "análisis demo"));
  const conversaciones = mockConversacionIARepositorio(
    overrides.conversaciones,
  );
  const uc = new AnalizarConAsistente(
    mockPacienteRepositorio(overrides.pacientes),
    mockPlanRepositorio(),
    mockAsignacionPlanRepositorio(overrides.asignaciones),
    mockRecetaRepositorio(),
    mockTurnoRepositorio(overrides.turnos),
    mockObjetivoRepositorio(),
    mockAlertaAlimentariaRepositorio(),
    mockAsistenteAnalitico({ responder }),
    mockReloj(AHORA),
    conversaciones,
  );
  return { uc, responder, conversaciones };
}

describe("AnalizarConAsistente", () => {
  it("delega en el asistente con la pregunta y un set de herramientas", async () => {
    const { uc, responder } = crear();

    const r = await uc.ejecutar({ pregunta: "¿Cuántos pacientes tengo?" });

    expect(r.pregunta).toBe("¿Cuántos pacientes tengo?");
    expect(r.respuesta).toBe("análisis demo");
    expect(r.conversacionId).toBeTruthy();
    const herramientas = responder.mock.calls[0]![1];
    expect(herramientas.map((h) => h.nombre)).toEqual(
      expect.arrayContaining([
        "listar_pacientes",
        "datos_de_paciente",
        "listar_planes",
        "detalle_de_plan",
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
      responder: async (_m, herramientas) => {
        const tool = herramientas.find((h) => h.nombre === "listar_pacientes")!;
        return tool.ejecutar({});
      },
    });

    const r = await uc.ejecutar({ pregunta: "listá mis pacientes" });

    expect(listar).toHaveBeenCalledOnce();
    expect(r.respuesta).toContain("pac-1");
  });

  it("proximos_turnos INCLUYE los de hoy", async () => {
    // El turno de hoy se guarda a medianoche UTC. Comparando contra la
    // medianoche LOCAL quedaba "antes de hoy" en cualquier huso al oeste de
    // Greenwich, y el asistente contestaba que no había turnos hoy.
    const { uc } = crear({
      turnos: {
        listar: vi.fn(async ({ estado }: { estado?: string } = {}) =>
          estado === "PENDIENTE"
            ? [turnoEjemplo({ fecha: HOY_UTC, hora: "09:00" }, "tur-hoy")]
            : [],
        ),
      },
      pacientes: {
        listar: vi.fn(async () => [pacienteEjemplo({}, "pac-1")]),
      },
      responder: async (_m, herramientas) => {
        const tool = herramientas.find((h) => h.nombre === "proximos_turnos")!;
        return tool.ejecutar({});
      },
    });

    const r = await uc.ejecutar({ pregunta: "¿qué turnos tengo hoy?" });

    expect(r.respuesta).toContain("2026-09-01");
    expect(r.respuesta).toContain("09:00");
  });

  it("le pasa al asistente la fecha de hoy", async () => {
    // Un modelo no sabe qué día es: sin esto no puede resolver "hoy".
    const { uc, responder } = crear();

    await uc.ejecutar({ pregunta: "¿qué turnos tengo hoy?" });

    expect(responder.mock.calls[0]![2]).toEqual(AHORA);
  });

  it("abre una conversación nueva y guarda los dos turnos", async () => {
    const { uc, conversaciones } = crear();

    const r = await uc.ejecutar({ pregunta: "¿Cuántos pacientes tengo?" });

    expect(conversaciones.crear).toHaveBeenCalledOnce();
    expect(conversaciones.agregarMensaje).toHaveBeenCalledTimes(2);
    const roles = vi
      .mocked(conversaciones.agregarMensaje)
      .mock.calls.map((c) => c[1].rol);
    expect(roles).toEqual(["USUARIO", "ASISTENTE"]);
    expect(r.conversacionId).toBeTruthy();
  });

  it("continúa una conversación existente y le manda los turnos previos", async () => {
    // Es lo que le faltaba al asistente: sin esto, cada pregunta viajaba sola
    // y un "¿y de ese paciente qué más?" no tenía a qué referirse.
    const previa = ConversacionIA.reconstruir({
      id: "conv-1",
      pacienteId: null,
      titulo: "Sobre Ana",
      mensajes: [
        {
          id: "m-1",
          rol: "USUARIO",
          contenido: "¿Cómo viene Ana?",
          creadoEn: AHORA,
        },
        {
          id: "m-2",
          rol: "ASISTENTE",
          contenido: "Ana bajó 2 kg.",
          creadoEn: AHORA,
        },
      ],
      creadoEn: AHORA,
      actualizadoEn: AHORA,
    });
    const { uc, responder, conversaciones } = crear({
      conversaciones: { obtenerPorId: vi.fn(async () => previa) },
    });

    const r = await uc.ejecutar({
      pregunta: "¿y su plan?",
      conversacionId: "conv-1",
    });

    expect(conversaciones.crear).not.toHaveBeenCalled();
    expect(r.conversacionId).toBe("conv-1");
    expect(responder.mock.calls[0]![0]).toEqual([
      { rol: "usuario", texto: "¿Cómo viene Ana?" },
      { rol: "asistente", texto: "Ana bajó 2 kg." },
      { rol: "usuario", texto: "¿y su plan?" },
    ]);
  });

  it("rechaza una pregunta vacía", async () => {
    const { uc } = crear();
    await expect(uc.ejecutar({ pregunta: "   " })).rejects.toThrow();
  });

  it("datos_de_paciente trae las OPCIONES de cada comida del plan", async () => {
    // Antes devolvía solo el nombre de la franja ("Desayuno"), así que el
    // asistente no podía decir qué come el paciente por más que se lo pidieran.
    const plan = {
      aPrimitivos: () => ({
        nombre: "Plan A",
        descripcion: null,
        caloriasMeta: 1800,
        proteinasMetaG: 120,
        carbohidratosMetaG: null,
        grasasMetaG: null,
        comidas: [
          {
            nombre: "Desayuno",
            horaDesde: "08:00",
            horaHasta: "09:00",
            opciones: [{ contenido: "Avena con fruta" }],
          },
        ],
        recomendaciones: [{ texto: "Tomar 2 L de agua" }],
      }),
    };
    const { uc } = crear({
      pacientes: {
        obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
      },
      asignaciones: {
        obtenerPlanActivoDePaciente: vi.fn(async () => plan as never),
      },
      responder: async (_m, herramientas) => {
        const tool = herramientas.find(
          (h) => h.nombre === "datos_de_paciente",
        )!;
        return tool.ejecutar({ pacienteId: "pac-1" });
      },
    });

    const r = await uc.ejecutar({ pregunta: "¿qué come Ana?" });

    expect(r.respuesta).toContain("Avena con fruta");
    expect(r.respuesta).toContain("Tomar 2 L de agua");
  });
});

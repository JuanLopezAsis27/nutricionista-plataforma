import { describe, it, expect, vi } from "vitest";
import { PreguntarAlAsistente } from "./PreguntarAlAsistente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { ConversacionIA } from "@/dominio/entidades/ConversacionIA";
import {
  mockPacienteRepositorio,
  mockObjetivoRepositorio,
  mockAsignacionPlanRepositorio,
  mockRecetaRepositorio,
  mockAlertaAlimentariaRepositorio,
  mockAxiomaRepositorio,
  mockAsistenteNutricional,
  mockConversacionIARepositorio,
  mockPerfilDeportivoRepositorio,
  mockCompetenciaRepositorio,
  mockReloj,
  pacienteEjemplo,
} from "../_ayudas-test";
import type { IConversacionIARepositorio } from "@/dominio/repositorios/IConversacionIARepositorio";

/** El caso de uso con todo mockeado salvo lo que cada test necesita ver. */
function armar(opciones: {
  responder?: ReturnType<typeof vi.fn>;
  conversaciones?: IConversacionIARepositorio;
  pacienteExiste?: boolean;
}) {
  return new PreguntarAlAsistente(
    mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () =>
        opciones.pacienteExiste === false ? null : pacienteEjemplo(),
      ),
    }),
    mockObjetivoRepositorio({ listarPorPaciente: vi.fn(async () => []) }),
    mockAsignacionPlanRepositorio({
      obtenerPlanActivoDePaciente: vi.fn(async () => null),
    }),
    mockRecetaRepositorio({ listarPorPaciente: vi.fn(async () => []) }),
    mockAlertaAlimentariaRepositorio({
      listarPorPaciente: vi.fn(async () => []),
    }),
    mockAxiomaRepositorio({ listarActivos: vi.fn(async () => []) }),
    mockAsistenteNutricional(
      opciones.responder ? { responder: opciones.responder } : {},
    ),
    opciones.conversaciones ?? mockConversacionIARepositorio(),
    mockPerfilDeportivoRepositorio(),
    mockCompetenciaRepositorio(),
    mockReloj(),
  );
}

describe("PreguntarAlAsistente", () => {
  it("arma el contexto, delega en el puerto (con herramientas) y abre un chat", async () => {
    const responder = vi.fn(async () => "respuesta demo");
    const crear = vi.fn(async () => {});
    const agregarMensaje = vi.fn(async () => {});
    const uc = armar({
      responder,
      conversaciones: mockConversacionIARepositorio({
        crear,
        agregarMensaje,
      }),
    });

    const resultado = await uc.ejecutar(
      "pac-1",
      "¿Cuántas calorías tiene mi plan?",
    );

    expect(resultado.respuesta).toBe("respuesta demo");
    expect(resultado.conversacionId).toEqual(expect.any(String));
    expect(responder).toHaveBeenCalledWith(
      "¿Cuántas calorías tiene mi plan?",
      expect.objectContaining({
        nombrePaciente: "Ana García",
        tienePlan: false,
      }),
      expect.arrayContaining([
        expect.objectContaining({ nombre: "obtener_plan_nutricional" }),
      ]),
      // Chat nuevo: no hay turnos anteriores que mandar.
      [],
    );
    expect(crear).toHaveBeenCalledOnce();
    // La pregunta se guarda antes de llamar al modelo y la respuesta después.
    expect(agregarMensaje).toHaveBeenCalledTimes(2);
    expect(agregarMensaje).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ rol: "USUARIO" }),
    );
    expect(agregarMensaje).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        rol: "ASISTENTE",
        contenido: "respuesta demo",
      }),
    );
  });

  /**
   * Lo que hacía que el asistente del paciente no sirviera para conversar: sin
   * los turnos previos, un "¿y con qué lo acompaño?" no tiene a qué referirse.
   */
  it("le manda al modelo los turnos anteriores del chat que continúa", async () => {
    const responder = vi.fn(async () => "con ensalada");
    const existente = ConversacionIA.reconstruir({
      id: "chat-1",
      pacienteId: "pac-1",
      titulo: "¿Qué ceno?",
      mensajes: [
        {
          id: "m1",
          rol: "USUARIO",
          contenido: "¿Qué ceno?",
          creadoEn: new Date("2026-09-01T20:00:00Z"),
        },
        {
          id: "m2",
          rol: "ASISTENTE",
          contenido: "Pollo al horno.",
          creadoEn: new Date("2026-09-01T20:00:01Z"),
        },
      ],
      creadoEn: new Date("2026-09-01T20:00:00Z"),
      actualizadoEn: new Date("2026-09-01T20:00:01Z"),
    });
    const crear = vi.fn(async () => {});
    const uc = armar({
      responder,
      conversaciones: mockConversacionIARepositorio({
        obtenerPorId: vi.fn(async () => existente),
        crear,
      }),
    });

    const resultado = await uc.ejecutar(
      "pac-1",
      "¿y con qué lo acompaño?",
      "chat-1",
    );

    expect(resultado.conversacionId).toBe("chat-1");
    // Continúa el chat: no abre uno nuevo.
    expect(crear).not.toHaveBeenCalled();
    expect(responder).toHaveBeenCalledWith(
      "¿y con qué lo acompaño?",
      expect.anything(),
      expect.anything(),
      [
        { rol: "usuario", texto: "¿Qué ceno?" },
        { rol: "asistente", texto: "Pollo al horno." },
      ],
    );
  });

  /**
   * Los chats de todos los pacientes y los del profesional viven en la misma
   * tabla: continuar uno ajeno sería leerlo entero como contexto.
   */
  it("no continúa el chat de otro paciente", async () => {
    const ajeno = ConversacionIA.iniciar(
      "hola",
      "chat-ajeno",
      new Date("2026-09-01T10:00:00Z"),
      "otro-paciente",
    );
    const uc = armar({
      conversaciones: mockConversacionIARepositorio({
        obtenerPorId: vi.fn(async () => ajeno),
      }),
    });

    await expect(
      uc.ejecutar("pac-1", "¿qué decía?", "chat-ajeno"),
    ).rejects.toBeInstanceOf(ErrorAccesoDenegado);
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const uc = armar({ pacienteExiste: false });

    await expect(uc.ejecutar("x", "hola")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});

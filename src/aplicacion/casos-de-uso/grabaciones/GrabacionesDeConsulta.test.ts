import { describe, it, expect, vi } from "vitest";
import {
  RegistrarGrabacion,
  COLA_TRANSCRIBIR_GRABACION,
} from "./RegistrarGrabacion";
import { GenerarResumenConsulta } from "./GenerarResumenConsulta";
import { ObtenerGrabacionesDeTurno } from "./ObtenerGrabacionesDeTurno";
import { EliminarGrabacion } from "./EliminarGrabacion";
import { ReintentarTranscripcion } from "./ReintentarTranscripcion";
import { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import { ResumenConsulta } from "@/dominio/entidades/ResumenConsulta";
import type { IResumidorConsulta } from "@/dominio/servicios/IResumidorConsulta";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorGrabacionNoEncontrada } from "@/dominio/errores/ErrorGrabacionNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockGrabacionRepositorio,
  mockTurnoRepositorio,
  mockArchivoRepositorio,
  mockPacienteRepositorio,
  mockAlmacenamientoArchivos,
  mockColaTrabajos,
  turnoEjemplo,
  archivoEjemplo,
  pacienteEjemplo,
  grabacionEjemplo,
} from "../_ayudas-test";

const audio = archivoEjemplo({
  nombreOriginal: "consulta.webm",
  mimeType: "audio/webm",
  contexto: "grabacion",
});

/** Grabación ya transcrita, como sale del repositorio. */
function transcrita(orden: number, texto: string): GrabacionConsulta {
  return GrabacionConsulta.reconstruir({
    ...grabacionEjemplo({ orden }).aPrimitivos(),
    estado: "LISTA",
    transcripcion: texto,
    archivoId: "arc-1",
  });
}

describe("RegistrarGrabacion", () => {
  function armar(
    parciales: {
      turno?: ReturnType<typeof turnoEjemplo> | null;
      dueno?: Record<string, string | undefined> | null;
    } = {},
  ) {
    const grabaciones = mockGrabacionRepositorio({
      siguienteOrden: vi.fn(async () => 3),
      crear: vi.fn(async (g: GrabacionConsulta) => g),
    });
    const cola = mockColaTrabajos();
    const casoUso = new RegistrarGrabacion(
      grabaciones,
      mockTurnoRepositorio({
        obtenerPorId: vi.fn(async () =>
          parciales.turno === undefined ? turnoEjemplo() : parciales.turno,
        ),
      }),
      mockArchivoRepositorio({
        obtenerPorId: vi.fn(async () => audio),
        obtenerDueno: vi.fn(async () => parciales.dueno ?? null),
      }),
      cola,
    );
    return { casoUso, grabaciones, cola };
  }

  it("crea la grabación con el siguiente orden y la encola", async () => {
    const { casoUso, grabaciones, cola } = armar();

    const grabacion = await casoUso.ejecutar({
      turnoId: "tur-1",
      archivoId: "arc-1",
      duracionSegundos: 900,
    });

    expect(grabacion.orden).toBe(3);
    expect(grabaciones.crear).toHaveBeenCalledWith(expect.anything(), "arc-1");
    // El trabajo lleva SOLO el id: el consultorio lo resuelve el worker
    // leyendo la fila en alcance global.
    expect(cola.encolar).toHaveBeenCalledWith(COLA_TRANSCRIBIR_GRABACION, {
      grabacionId: grabacion.id,
    });
  });

  it("rechaza un turno que no es de este consultorio", async () => {
    // El alcance de inquilino filtra la lectura: "no aparece" es "no es tuyo".
    const { casoUso, cola } = armar({ turno: null });

    await expect(
      casoUso.ejecutar({ turnoId: "tur-x", archivoId: "arc-1" }),
    ).rejects.toBeInstanceOf(ErrorTurnoNoEncontrado);
    expect(cola.encolar).not.toHaveBeenCalled();
  });

  it("rechaza un audio que ya tiene dueño", async () => {
    // La FK del audio es 1 a 1: sin esto, mandar el id del audio de otra
    // grabación se lo robaría y la dejaría sin audio.
    const { casoUso, grabaciones } = armar({ dueno: { recetaId: "rec-1" } });

    await expect(
      casoUso.ejecutar({ turnoId: "tur-1", archivoId: "arc-1" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(grabaciones.crear).not.toHaveBeenCalled();
  });
});

describe("GenerarResumenConsulta", () => {
  function resumidor(
    parcial: Partial<IResumidorConsulta> = {},
  ): IResumidorConsulta {
    return {
      resumir: vi.fn(async () => ({
        texto: "## Motivo de consulta\nControl mensual.",
        modelo: "claude-opus-5",
      })),
      ...parcial,
    };
  }

  function armar(
    listas: GrabacionConsulta[],
    existente: ResumenConsulta | null = null,
    resumidorUsado = resumidor(),
  ) {
    const grabaciones = mockGrabacionRepositorio({
      listarPorTurno: vi.fn(async () => listas),
      obtenerResumen: vi.fn(async () => existente),
      guardarResumen: vi.fn(async (r: ResumenConsulta) => r),
    });
    const casoUso = new GenerarResumenConsulta(
      grabaciones,
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turnoEjemplo()) }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      resumidorUsado,
    );
    return { casoUso, grabaciones, resumidor: resumidorUsado };
  }

  it("resume TODAS las transcripciones del turno, en orden", async () => {
    // Lo que se resume es la CONSULTA; las grabaciones son los pedazos en que
    // quedó partida.
    const usado = resumidor();
    const { casoUso } = armar(
      [transcrita(2, "segunda parte"), transcrita(1, "primera parte")],
      null,
      usado,
    );

    const resumen = await casoUso.ejecutar("tur-1");

    expect(vi.mocked(usado.resumir).mock.calls[0]![0]).toEqual([
      { orden: 1, texto: "primera parte" },
      { orden: 2, texto: "segunda parte" },
    ]);
    expect(resumen!.aPrimitivos().grabacionesIncluidas).toBe(2);
  });

  it("ignora las grabaciones que todavía no están transcritas", async () => {
    const usado = resumidor();
    const { casoUso } = armar(
      [transcrita(1, "lista"), grabacionEjemplo({ orden: 2 })],
      null,
      usado,
    );

    await casoUso.ejecutar("tur-1");

    expect(vi.mocked(usado.resumir).mock.calls[0]![0]).toHaveLength(1);
  });

  it("el disparo automático no regenera un resumen que ya está al día", async () => {
    // Tres grabaciones que terminan juntas dispararían tres llamadas al modelo.
    const existente = ResumenConsulta.crear(
      { turnoId: "tur-1", texto: "viejo", grabacionesIncluidas: 1 },
      "res-1",
    );
    const usado = resumidor();
    const { casoUso } = armar([transcrita(1, "una")], existente, usado);

    const resultado = await casoUso.ejecutar("tur-1", { soloSiFalta: true });

    expect(resultado).toBe(existente);
    expect(usado.resumir).not.toHaveBeenCalled();
  });

  it("el disparo automático SÍ regenera si apareció una transcripción nueva", async () => {
    const existente = ResumenConsulta.crear(
      { turnoId: "tur-1", texto: "viejo", grabacionesIncluidas: 1 },
      "res-1",
    );
    const usado = resumidor();
    const { casoUso, grabaciones } = armar(
      [transcrita(1, "una"), transcrita(2, "dos")],
      existente,
      usado,
    );

    const resumen = await casoUso.ejecutar("tur-1", { soloSiFalta: true });

    expect(usado.resumir).toHaveBeenCalledOnce();
    // Reusa el id: hay UNO por turno y crear otro chocaría contra el único.
    expect(resumen!.id).toBe("res-1");
    expect(grabaciones.guardarResumen).toHaveBeenCalledOnce();
  });

  it("sin transcripciones el automático no hace nada y el pedido a mano avisa", async () => {
    const { casoUso } = armar([]);

    expect(await casoUso.ejecutar("tur-1", { soloSiFalta: true })).toBeNull();
    await expect(casoUso.ejecutar("tur-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
  });
});

describe("ObtenerGrabacionesDeTurno", () => {
  it("marca el resumen como desactualizado si le falta una transcripción", async () => {
    const consulta = await new ObtenerGrabacionesDeTurno(
      mockGrabacionRepositorio({
        listarPorTurno: vi.fn(async () => [
          transcrita(1, "una"),
          transcrita(2, "dos"),
        ]),
        obtenerResumen: vi.fn(async () =>
          ResumenConsulta.crear(
            { turnoId: "tur-1", texto: "viejo", grabacionesIncluidas: 1 },
            "res-1",
          ),
        ),
      }),
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turnoEjemplo()) }),
    ).ejecutar("tur-1");

    expect(consulta.resumenDesactualizado).toBe(true);
  });

  it("una grabación que todavía se transcribe NO vuelve viejo al resumen", async () => {
    const consulta = await new ObtenerGrabacionesDeTurno(
      mockGrabacionRepositorio({
        listarPorTurno: vi.fn(async () => [
          transcrita(1, "una"),
          grabacionEjemplo({ orden: 2 }),
        ]),
        obtenerResumen: vi.fn(async () =>
          ResumenConsulta.crear(
            { turnoId: "tur-1", texto: "al día", grabacionesIncluidas: 1 },
            "res-1",
          ),
        ),
      }),
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turnoEjemplo()) }),
    ).ejecutar("tur-1");

    expect(consulta.resumenDesactualizado).toBe(false);
  });
});

describe("EliminarGrabacion", () => {
  it("borra la fila y después el objeto del bucket", async () => {
    const almacenamiento = mockAlmacenamientoArchivos();
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(async () =>
        GrabacionConsulta.reconstruir({
          ...grabacionEjemplo().aPrimitivos(),
          archivoId: "arc-1",
        }),
      ),
    });

    await new EliminarGrabacion(
      grabaciones,
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => audio) }),
      almacenamiento,
    ).ejecutar("gra-1");

    expect(grabaciones.eliminar).toHaveBeenCalledWith("gra-1");
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(audio.clave);
  });

  it("lanza si la grabación no existe", async () => {
    await expect(
      new EliminarGrabacion(
        mockGrabacionRepositorio(),
        mockArchivoRepositorio(),
        mockAlmacenamientoArchivos(),
      ).ejecutar("gra-x"),
    ).rejects.toBeInstanceOf(ErrorGrabacionNoEncontrada);
  });
});

describe("ReintentarTranscripcion", () => {
  it("reinicia los intentos y vuelve a encolar", async () => {
    // El pedido a mano viene DESPUÉS de arreglar la causa (cargar la clave):
    // arrancar con los intentos agotados haría fallar el primer reintento.
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(async () =>
        GrabacionConsulta.reconstruir({
          ...grabacionEjemplo().aPrimitivos(),
          estado: "FALLIDA",
          intentos: 3,
          error: "sin clave",
        }),
      ),
    });
    const cola = mockColaTrabajos();

    await new ReintentarTranscripcion(grabaciones, cola).ejecutar("gra-1");

    const guardada = vi
      .mocked(grabaciones.guardar)
      .mock.calls[0]![0].aPrimitivos();
    expect(guardada).toMatchObject({
      estado: "PENDIENTE",
      intentos: 0,
      error: null,
    });
    expect(cola.encolar).toHaveBeenCalledWith(COLA_TRANSCRIBIR_GRABACION, {
      grabacionId: "gra-1",
    });
  });

  it("no reintenta una que ya está transcrita", async () => {
    const cola = mockColaTrabajos();
    await expect(
      new ReintentarTranscripcion(
        mockGrabacionRepositorio({
          obtenerPorId: vi.fn(async () => transcrita(1, "ya estaba")),
        }),
        cola,
      ).ejecutar("gra-1"),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(cola.encolar).not.toHaveBeenCalled();
  });
});

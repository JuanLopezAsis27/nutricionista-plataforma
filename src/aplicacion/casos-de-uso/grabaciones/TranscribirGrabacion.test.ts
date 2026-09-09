import { describe, it, expect, vi } from "vitest";
import { TranscribirGrabacion } from "./TranscribirGrabacion";
import type { ITranscriptorAudio } from "@/dominio/servicios/ITranscriptorAudio";
import { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import { ErrorGrabacionNoEncontrada } from "@/dominio/errores/ErrorGrabacionNoEncontrada";
import {
  mockGrabacionRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  archivoEjemplo,
  grabacionEjemplo,
} from "../_ayudas-test";

/** Grabación con su audio ya vinculado, que es como sale del repositorio. */
function conAudio(
  cambios: Partial<ReturnType<GrabacionConsulta["aPrimitivos"]>> = {},
): GrabacionConsulta {
  return GrabacionConsulta.reconstruir({
    ...grabacionEjemplo().aPrimitivos(),
    archivoId: "arc-1",
    nombreArchivo: "consulta.webm",
    mimeType: "audio/webm",
    tamanoBytes: 2048,
    ...cambios,
  });
}

const audio = archivoEjemplo({
  nombreOriginal: "consulta.webm",
  mimeType: "audio/webm",
  contexto: "grabacion",
});

function transcriptor(
  parcial: Partial<ITranscriptorAudio> = {},
): ITranscriptorAudio {
  return {
    estaConfigurado: vi.fn(async () => true),
    transcribir: vi.fn(async () => "Buenas, ¿cómo venís con el plan?"),
    ...parcial,
  };
}

describe("TranscribirGrabacion", () => {
  it("guarda la transcripción y deja la grabación lista", async () => {
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(async () => conAudio()),
    });
    const casoUso = new TranscribirGrabacion(
      grabaciones,
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => audio) }),
      mockAlmacenamientoArchivos(),
      transcriptor(),
    );

    const resultado = await casoUso.ejecutar("gra-1");

    expect(resultado.estado).toBe("TRANSCRITA");
    const guardadas = vi
      .mocked(grabaciones.guardar)
      .mock.calls.map(([g]) => g.aPrimitivos());
    // Dos guardados: primero TRANSCRIBIENDO (con el intento ya contado) y
    // después LISTA. El primero es el que evita que un proceso que se muere
    // deje la grabación reintentándose para siempre.
    expect(guardadas[0]!.estado).toBe("TRANSCRIBIENDO");
    expect(guardadas[0]!.intentos).toBe(1);
    expect(guardadas[1]!.estado).toBe("LISTA");
    expect(guardadas[1]!.transcripcion).toBe(
      "Buenas, ¿cómo venís con el plan?",
    );
  });

  it("no vuelve a transcribir una grabación que ya está lista", async () => {
    // El trabajo encolado y el barrido de rescate pueden llegar los dos a la
    // misma grabación: transcribir de nuevo es pagar dos veces el mismo audio.
    const transcriptorEspia = transcriptor();
    const casoUso = new TranscribirGrabacion(
      mockGrabacionRepositorio({
        obtenerPorId: vi.fn(async () =>
          conAudio().marcarEnCurso().marcarTranscrita("ya estaba"),
        ),
      }),
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
      transcriptorEspia,
    );

    const resultado = await casoUso.ejecutar("gra-1");

    expect(resultado.estado).toBe("OMITIDA");
    expect(transcriptorEspia.transcribir).not.toHaveBeenCalled();
  });

  it("anota el fallo del proveedor SIN lanzar, y deja reintentar", async () => {
    // Si lanzara, pg-boss reintentaría con su propia política en paralelo a la
    // de la entidad, y el profesional no vería nunca el motivo.
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(async () => conAudio()),
    });
    const casoUso = new TranscribirGrabacion(
      grabaciones,
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => audio) }),
      mockAlmacenamientoArchivos(),
      transcriptor({
        transcribir: vi.fn(async () => {
          throw new Error("429 rate limit");
        }),
      }),
    );

    const resultado = await casoUso.ejecutar("gra-1");

    expect(resultado).toEqual({
      estado: "FALLIDA",
      motivo: "429 rate limit",
      volveraAIntentarse: true,
    });
    const ultima = vi
      .mocked(grabaciones.guardar)
      .mock.calls.at(-1)![0]
      .aPrimitivos();
    expect(ultima.estado).toBe("PENDIENTE");
    expect(ultima.error).toBe("429 rate limit");
  });

  it("agotados los intentos queda FALLIDA y no vuelve a la cola", async () => {
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(
        async () => conAudio({ intentos: 2 }), // el intento de esta corrida la lleva a 3
      ),
    });
    const casoUso = new TranscribirGrabacion(
      grabaciones,
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => audio) }),
      mockAlmacenamientoArchivos(),
      transcriptor({
        transcribir: vi.fn(async () => {
          throw new Error("audio corrupto");
        }),
      }),
    );

    const resultado = await casoUso.ejecutar("gra-1");

    expect(resultado).toMatchObject({ volveraAIntentarse: false });
    const ultima = vi
      .mocked(grabaciones.guardar)
      .mock.calls.at(-1)![0]
      .aPrimitivos();
    expect(ultima.estado).toBe("FALLIDA");
  });

  it("una transcripción vacía no se guarda como lista", async () => {
    // Un audio sin voz devuelve cadena vacía. Dejarlo pasar generaría después
    // un resumen de la nada.
    const grabaciones = mockGrabacionRepositorio({
      obtenerPorId: vi.fn(async () => conAudio()),
    });
    const casoUso = new TranscribirGrabacion(
      grabaciones,
      mockArchivoRepositorio({ obtenerPorId: vi.fn(async () => audio) }),
      mockAlmacenamientoArchivos(),
      transcriptor({ transcribir: vi.fn(async () => "   ") }),
    );

    const resultado = await casoUso.ejecutar("gra-1");

    expect(resultado.estado).toBe("FALLIDA");
    const ultima = vi
      .mocked(grabaciones.guardar)
      .mock.calls.at(-1)![0]
      .aPrimitivos();
    expect(ultima.transcripcion).toBeNull();
  });

  it("lanza si la grabación no existe: eso es un error de programa", async () => {
    const casoUso = new TranscribirGrabacion(
      mockGrabacionRepositorio(),
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
      transcriptor(),
    );

    await expect(casoUso.ejecutar("gra-x")).rejects.toBeInstanceOf(
      ErrorGrabacionNoEncontrada,
    );
  });
});

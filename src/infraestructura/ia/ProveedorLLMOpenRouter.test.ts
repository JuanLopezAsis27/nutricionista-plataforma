import { describe, it, expect, vi, afterEach } from "vitest";
import { ProveedorLLMOpenRouter } from "./ProveedorLLMOpenRouter";
import type { AvanceIA } from "@/dominio/servicios/avanceIA";

/** Arma una respuesta SSE con los trozos dados, partida como los manda la red. */
function respuestaSSE(trozos: unknown[], corteRaro = false): Response {
  const lineas = trozos
    .map((t) => `data: ${JSON.stringify(t)}\n\n`)
    .concat("data: [DONE]\n\n")
    .join("");

  const codificador = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    start(controlador) {
      if (corteRaro) {
        // Los eventos llegan partidos por la mitad de su JSON, que es lo normal
        // en una respuesta larga.
        for (let i = 0; i < lineas.length; i += 7) {
          controlador.enqueue(codificador.encode(lineas.slice(i, i + 7)));
        }
      } else {
        controlador.enqueue(codificador.encode(lineas));
      }
      controlador.close();
    },
  });
  return new Response(cuerpo, {
    headers: { "content-type": "text/event-stream" },
  });
}

function textoDelta(contenido: string) {
  return { choices: [{ delta: { content: contenido } }] };
}

describe("ProveedorLLMOpenRouter — respuesta en stream", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emite el texto a medida que llega y devuelve el total", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      respuestaSSE([
        textoDelta("Comé "),
        textoDelta("más "),
        textoDelta("verduras."),
      ]),
    );
    const proveedor = new ProveedorLLMOpenRouter(
      "sk-or-x",
      "openai/gpt-4o-mini",
    );
    const avances: AvanceIA[] = [];

    const texto = await proveedor.conversar({
      system: "sos un asistente",
      mensajes: [{ rol: "usuario", texto: "¿qué ceno?" }],
      maxTokens: 100,
      herramientas: [],
      ejecutar: async () => "",
      alAvanzar: (a) => avances.push(a),
    });

    expect(avances).toEqual([
      { tipo: "texto", texto: "Comé " },
      { tipo: "texto", texto: "más " },
      { tipo: "texto", texto: "verduras." },
    ]);
    expect(texto).toBe("Comé más verduras.");
  });

  it("pide el stream y no lo pide cuando nadie escucha", async () => {
    const fetchFalso = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: "hola" } }] }),
      );
    const proveedor = new ProveedorLLMOpenRouter(
      "sk-or-x",
      "openai/gpt-4o-mini",
    );

    await proveedor.conversar({
      system: "s",
      mensajes: [{ rol: "usuario", texto: "hola" }],
      maxTokens: 100,
      herramientas: [],
      ejecutar: async () => "",
    });

    const cuerpo = JSON.parse(
      (fetchFalso.mock.calls[0]![1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(cuerpo.stream).toBeUndefined();
  });

  /**
   * Los `arguments` de una tool-call llegan en pedazos de JSON. Si no se
   * concatenan, el loop de herramientas no ve nunca que el modelo pidió una y
   * el asistente contesta sin haber mirado los datos del paciente.
   */
  it("rearma la llamada a herramienta repartida en varios trozos", async () => {
    const ejecutar = vi.fn(async () => "Plan: 1800 kcal");
    let vuelta = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      vuelta += 1;
      if (vuelta === 1) {
        return respuestaSSE([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_1",
                      function: { name: "obtener_plan", arguments: '{"pac' },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, function: { arguments: 'ienteId":"p1"}' } },
                  ],
                },
              },
            ],
          },
        ]);
      }
      return respuestaSSE([textoDelta("Tu plan tiene 1800 kcal.")]);
    });
    const proveedor = new ProveedorLLMOpenRouter(
      "sk-or-x",
      "openai/gpt-4o-mini",
    );
    const avances: AvanceIA[] = [];

    const texto = await proveedor.conversar({
      system: "s",
      mensajes: [{ rol: "usuario", texto: "¿mi plan?" }],
      maxTokens: 100,
      herramientas: [
        { nombre: "obtener_plan", descripcion: "el plan", esquema: {} },
      ],
      ejecutar,
      alAvanzar: (a) => avances.push(a),
    });

    expect(ejecutar).toHaveBeenCalledWith("obtener_plan", { pacienteId: "p1" });
    // El aviso de herramienta le dice al chat que borre lo mostrado hasta ahí.
    expect(avances).toContainEqual({
      tipo: "herramienta",
      nombre: "obtener_plan",
    });
    expect(texto).toBe("Tu plan tiene 1800 kcal.");
  });

  it("rearma los eventos que llegan cortados por la mitad", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      respuestaSSE(
        [textoDelta("una respuesta"), textoDelta(" bien larga")],
        true,
      ),
    );
    const proveedor = new ProveedorLLMOpenRouter(
      "sk-or-x",
      "openai/gpt-4o-mini",
    );

    const texto = await proveedor.conversar({
      system: "s",
      mensajes: [{ rol: "usuario", texto: "hola" }],
      maxTokens: 100,
      herramientas: [],
      ejecutar: async () => "",
      alAvanzar: () => {},
    });

    expect(texto).toBe("una respuesta bien larga");
  });

  it("propaga el error que viene adentro del stream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      respuestaSSE([
        { error: { message: "openai-4o-mini is not a valid model" } },
      ]),
    );
    const proveedor = new ProveedorLLMOpenRouter("sk-or-x", "openai-4o-mini");

    await expect(
      proveedor.conversar({
        system: "s",
        mensajes: [{ rol: "usuario", texto: "hola" }],
        maxTokens: 100,
        herramientas: [],
        ejecutar: async () => "",
        alAvanzar: () => {},
      }),
    ).rejects.toThrow("not a valid model");
  });
});

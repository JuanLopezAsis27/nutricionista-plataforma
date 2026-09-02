import type {
  IProveedorLLM,
  OpcionesLLM,
  OpcionesConversacion,
  EsfuerzoLLM,
} from "./IProveedorLLM";
import { ejecutarHerramientaSegura, parsearArgumentos } from "./herramientas";

const URL = "https://openrouter.ai/api/v1/chat/completions";
const TIEMPO_LIMITE_MS = 45000;

interface LlamadaHerramienta {
  id: string;
  function?: { name?: string; arguments?: string };
}
interface MensajeOpenRouter {
  role?: string;
  content?: string | null;
  tool_calls?: LlamadaHerramienta[];
}
interface RespuestaOpenRouter {
  choices?: Array<{ message?: MensajeOpenRouter }>;
  error?: { message?: string };
}

/**
 * Proveedor LLM con OpenRouter (API compatible con OpenAI). Sirve muchos
 * modelos (`anthropic/claude-*`, `openai/gpt-*`, etc.) con una sola key. Usa el
 * formato de chat de OpenAI: el `thinking` de Anthropic no existe acá, y el
 * esfuerzo se pide con el parámetro unificado `reasoning`.
 */
export class ProveedorLLMOpenRouter implements IProveedorLLM {
  constructor(
    private readonly apiKey: string,
    readonly modelo: string,
  ) {}

  async completar(opts: OpcionesLLM): Promise<string> {
    const contenido = opts.usuario.map((b) => {
      if (b.tipo === "texto") return { type: "text", text: b.texto };
      if (b.tipo === "documento") {
        return {
          type: "file",
          file: {
            filename: "documento.pdf",
            file_data: `data:${b.mimeType};base64,${b.base64}`,
          },
        };
      }
      return {
        type: "image_url",
        image_url: { url: `data:${b.mimeType};base64,${b.base64}` },
      };
    });

    // OpenRouter no soporta `response_format: json_object` en varios modelos
    // (los de Anthropic lo rechazan con error) → NO lo mandamos. El formato se
    // refuerza por prompt y la respuesta se parsea defensivamente.
    //
    // Va el esquema ENTERO, serializado. Antes iba solo la lista de claves de
    // PRIMER NIVEL, y eso rompía toda extracción anidada: al modelo se le
    // pedían "paciente, antropometria, alertas" sin decirle NUNCA qué campos
    // van adentro de cada una, así que inventaba los nombres internos y el
    // normalizador —que lee claves exactas— los descartaba en silencio. La
    // ficha de un paciente volvía medio vacía sin ningún error a la vista.
    const system = opts.esquemaJson
      ? [
          opts.system,
          "",
          "Respondé SOLO con un objeto JSON válido que cumpla EXACTAMENTE este JSON Schema.",
          "Usá los nombres de campo tal cual figuran acá, incluidos los de los objetos anidados.",
          "Incluí todas las claves requeridas, con null cuando no haya dato. Sin explicaciones ni markdown.",
          "",
          JSON.stringify(opts.esquemaJson.esquema),
        ].join("\n")
      : opts.system;

    const body: Record<string, unknown> = {
      model: this.modelo,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: contenido },
      ],
      ...razonamiento(opts.esfuerzo),
    };

    const respuesta = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "X-Title": "Consultorio",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new Error(
        `OpenRouter respondió ${respuesta.status}. ${detalle.slice(0, 300)}`,
      );
    }
    const j = (await respuesta.json()) as RespuestaOpenRouter;
    if (j.error) throw new Error(j.error.message ?? "Error de OpenRouter.");
    const contenidoTexto = (j.choices?.[0]?.message?.content ?? "").trim();

    // Si pedimos JSON, devolvemos solo el objeto (sin fences ```json ni texto extra).
    return opts.esquemaJson ? extraerJSON(contenidoTexto) : contenidoTexto;
  }

  async conversar(opts: OpcionesConversacion): Promise<string> {
    const tools = opts.herramientas.map((h) => ({
      type: "function",
      function: {
        name: h.nombre,
        description: h.descripcion,
        parameters: h.esquema,
      },
    }));
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: opts.system },
      ...opts.mensajes.map((turno) => ({
        role: turno.rol === "usuario" ? "user" : "assistant",
        content: turno.texto,
      })),
    ];
    const maxIteraciones = opts.maxIteraciones ?? 4;

    for (let i = 0; i < maxIteraciones; i++) {
      const msg = await this.pedir({
        model: this.modelo,
        max_tokens: opts.maxTokens,
        messages,
        tools,
        tool_choice: "auto",
        ...razonamiento(opts.esfuerzo),
      });
      const llamadas = msg.tool_calls ?? [];
      if (llamadas.length === 0) {
        return (msg.content ?? "").trim();
      }

      // El modelo pidió herramientas: ejecutamos y devolvemos cada resultado.
      messages.push(msg as Record<string, unknown>);
      for (const llamada of llamadas) {
        const salida = await ejecutarHerramientaSegura(
          opts.ejecutar,
          llamada.function?.name ?? "",
          parsearArgumentos(llamada.function?.arguments),
        );
        messages.push({
          role: "tool",
          tool_call_id: llamada.id,
          content: salida,
        });
      }
    }

    // Se agotaron las vueltas: una llamada final SIN herramientas para cerrar.
    const cierre = await this.pedir({
      model: this.modelo,
      max_tokens: opts.maxTokens,
      messages,
    });
    return (cierre.content ?? "").trim();
  }

  /** POST a OpenRouter; devuelve el `message` de la primera choice. */
  private async pedir(
    body: Record<string, unknown>,
  ): Promise<MensajeOpenRouter> {
    const respuesta = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "X-Title": "Consultorio",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new Error(
        `OpenRouter respondió ${respuesta.status}. ${detalle.slice(0, 300)}`,
      );
    }
    const j = (await respuesta.json()) as RespuestaOpenRouter;
    if (j.error) throw new Error(j.error.message ?? "Error de OpenRouter.");
    return j.choices?.[0]?.message ?? {};
  }
}

/**
 * Esfuerzo de razonamiento, con el parámetro unificado de OpenRouter.
 *
 * Es el equivalente de `output_config.effort` de Anthropic. Los modelos que no
 * razonan lo ignoran, así que mandarlo siempre es seguro; se omite en el nivel
 * bajo para no cambiarle el comportamiento a lo que ya andaba.
 */
function razonamiento(
  esfuerzo: EsfuerzoLLM | undefined,
): Record<string, unknown> {
  if (!esfuerzo || esfuerzo === "bajo") return {};
  return { reasoning: { effort: esfuerzo === "alto" ? "high" : "medium" } };
}

/** Limpia la respuesta del modelo para quedarse solo con el objeto JSON. */
function extraerJSON(texto: string): string {
  let s = texto.trim();
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
  }
  const inicio = s.indexOf("{");
  const fin = s.lastIndexOf("}");
  return inicio >= 0 && fin >= inicio ? s.slice(inicio, fin + 1) : s;
}

import type {
  IProveedorLLM,
  OpcionesLLM,
  OpcionesConversacion,
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
 * formato de chat de OpenAI (sin thinking/effort; esos son de Anthropic).
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
    // (los de Anthropic lo rechazan con error) → NO lo mandamos. Reforzamos el
    // formato por prompt y parseamos defensivamente la respuesta.
    const system = opts.esquemaJson
      ? `${opts.system}\nRespondé SOLO con un objeto JSON válido con exactamente estas claves: ${clavesDe(opts.esquemaJson.esquema).join(", ")}. Sin explicaciones ni markdown.`
      : opts.system;

    const body: Record<string, unknown> = {
      model: this.modelo,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: contenido },
      ],
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
      { role: "user", content: opts.pregunta },
    ];
    const maxIteraciones = opts.maxIteraciones ?? 4;

    for (let i = 0; i < maxIteraciones; i++) {
      const msg = await this.pedir({
        model: this.modelo,
        max_tokens: opts.maxTokens,
        messages,
        tools,
        tool_choice: "auto",
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

function clavesDe(esquema: Record<string, unknown>): string[] {
  const props = esquema.properties;
  return props && typeof props === "object" ? Object.keys(props) : [];
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

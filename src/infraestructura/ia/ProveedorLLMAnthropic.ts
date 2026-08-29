import type Anthropic from "@anthropic-ai/sdk";
import type {
  IProveedorLLM,
  OpcionesLLM,
  OpcionesConversacion,
} from "./IProveedorLLM";
import { extraerTexto } from "./respuestaClaude";
import { ejecutarHerramientaSegura } from "./herramientas";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const MIMES: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Proveedor LLM con la API de Anthropic (Claude directo). */
export class ProveedorLLMAnthropic implements IProveedorLLM {
  constructor(
    private readonly cliente: Anthropic,
    private readonly modelo: string,
  ) {}

  async completar(opts: OpcionesLLM): Promise<string> {
    const contenido: Anthropic.Messages.ContentBlockParam[] = opts.usuario.map(
      (b) =>
        b.tipo === "texto"
          ? { type: "text", text: b.texto }
          : {
              type: "image",
              source: {
                type: "base64",
                media_type: normalizarMime(b.mimeType),
                data: b.base64,
              },
            },
    );

    const respuesta = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: opts.maxTokens,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        ...(opts.esquemaJson
          ? {
              format: {
                type: "json_schema" as const,
                schema: opts.esquemaJson.esquema,
              },
            }
          : {}),
      },
      system: opts.system,
      messages: [{ role: "user", content: contenido }],
    });

    if (respuesta.stop_reason === "refusal") {
      throw new Error("La IA rechazó la solicitud.");
    }
    return extraerTexto(respuesta);
  }

  async conversar(opts: OpcionesConversacion): Promise<string> {
    const tools: Anthropic.Messages.Tool[] = opts.herramientas.map((h) => ({
      name: h.nombre,
      description: h.descripcion,
      input_schema: h.esquema as Anthropic.Messages.Tool.InputSchema,
    }));
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: opts.pregunta },
    ];
    const maxIteraciones = opts.maxIteraciones ?? 4;

    for (let i = 0; i < maxIteraciones; i++) {
      const respuesta = await this.cliente.messages.create({
        model: this.modelo,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages,
        tools,
      });
      if (respuesta.stop_reason === "refusal") {
        throw new Error("La IA rechazó la solicitud.");
      }
      if (respuesta.stop_reason !== "tool_use") {
        return extraerTexto(respuesta);
      }

      // El modelo pidió herramientas: las ejecutamos y devolvemos los resultados.
      messages.push({ role: "assistant", content: respuesta.content });
      const resultados: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const bloque of respuesta.content) {
        if (bloque.type === "tool_use") {
          const salida = await ejecutarHerramientaSegura(
            opts.ejecutar,
            bloque.name,
            bloque.input,
          );
          resultados.push({
            type: "tool_result",
            tool_use_id: bloque.id,
            content: salida,
          });
        }
      }
      messages.push({ role: "user", content: resultados });
    }

    // Se agotaron las vueltas: una llamada final SIN herramientas para cerrar.
    const cierre = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages,
    });
    return extraerTexto(cierre);
  }
}

function normalizarMime(mime: string): MediaType {
  return (MIMES.includes(mime) ? mime : "image/jpeg") as MediaType;
}

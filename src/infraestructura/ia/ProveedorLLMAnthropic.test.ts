import { describe, it, expect, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { ProveedorLLMAnthropic } from "./ProveedorLLMAnthropic";
import type { OpcionesLLM } from "./IProveedorLLM";

/** Cliente de Anthropic falso: `messages.stream` termina en el mensaje dado. */
function clienteQueDevuelve(mensaje: unknown) {
  const stream = vi.fn(() => ({ finalMessage: async () => mensaje }));
  const create = vi.fn();
  return {
    cliente: { messages: { stream, create } } as unknown as Anthropic,
    stream,
    create,
  };
}

const PEDIDO_JSON: OpcionesLLM = {
  system: "s",
  usuario: [{ tipo: "texto", texto: "leé esta planilla" }],
  maxTokens: 64000,
  esquemaJson: { nombre: "x", esquema: { type: "object" } },
};

describe("ProveedorLLMAnthropic.completar", () => {
  it("pide en stream, que es lo que permite un tope de tokens alto", async () => {
    const { cliente, stream, create } = clienteQueDevuelve({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"ok":true}' }],
    });

    const texto = await new ProveedorLLMAnthropic(
      cliente,
      "claude-opus-5",
    ).completar(PEDIDO_JSON);

    expect(texto).toBe('{"ok":true}');
    expect(stream).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });

  it("avisa que la respuesta se cortó en vez de devolver medio JSON", async () => {
    // Era el error de la planilla larga: el JSON llegaba cortado por el tope
    // y lo único que se veía era el `JSON.parse` fallando como error genérico.
    const { cliente } = clienteQueDevuelve({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: '{"mediciones":[{"fecha":' }],
    });

    await expect(
      new ProveedorLLMAnthropic(cliente, "claude-opus-5").completar(
        PEDIDO_JSON,
      ),
    ).rejects.toThrow(/se cortó/);
  });
});

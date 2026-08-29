import type Anthropic from "@anthropic-ai/sdk";

/** Concatena el texto de los bloques `text` de una respuesta de Claude. */
export function extraerTexto(respuesta: Anthropic.Messages.Message): string {
  return respuesta.content
    .filter(
      (bloque): bloque is Anthropic.Messages.TextBlock =>
        bloque.type === "text",
    )
    .map((bloque) => bloque.text)
    .join("")
    .trim();
}

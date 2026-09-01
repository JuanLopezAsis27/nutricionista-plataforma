import type {
  AudioParaTranscribir,
  ITranscriptorAudio,
  OpcionesTranscripcion,
} from "@/dominio/servicios/ITranscriptorAudio";

const URL = "https://openrouter.ai/api/v1/chat/completions";
const TIEMPO_LIMITE_MS = 10 * 60 * 1000;

/**
 * Formatos que el campo `input_audio` acepta. Es una lista corta y cerrada, así
 * que el WebM que graba Chrome NO entra por acá.
 */
const FORMATOS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

interface RespuestaOpenRouter {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

/**
 * Voz a texto con OpenRouter.
 *
 * OpenRouter **no tiene** un endpoint de transcripción: expone chat, y el audio
 * entra como un bloque `input_audio` de un mensaje, contra un modelo que
 * escuche (`google/gemini-*`, `openai/gpt-4o-audio-*`). Así que esto no es «la
 * misma API con otra URL»: es pedirle a un modelo de chat que escriba lo que
 * escucha, y por eso lleva un system prompt que le prohíbe resumir o comentar.
 *
 * Dos límites que conviene saber antes de elegir este proveedor:
 *
 *  - **Formatos.** El bloque de audio acepta una lista corta (mp3, mp4, wav) y
 *    no incluye WebM, que es lo que graba Chrome. Un audio grabado en Chrome
 *    falla acá con un mensaje claro en vez de con un 400 del proveedor.
 *  - **Fidelidad.** Un modelo de chat puede resumir de más o saltear tramos; un
 *    transcriptor dedicado no. Para consultas largas, OpenAI da mejor
 *    resultado.
 *
 * Existe igual porque quien ya paga OpenRouter no tiene por qué abrir una
 * cuenta más para probar la función.
 */
export class TranscriptorOpenRouter implements ITranscriptorAudio {
  constructor(
    private readonly apiKey: string,
    private readonly modelo: string,
  ) {}

  async estaConfigurado(): Promise<boolean> {
    return true;
  }

  async transcribir(
    audio: AudioParaTranscribir,
    opciones?: OpcionesTranscripcion,
  ): Promise<string> {
    const formato = FORMATOS[audio.mimeType];
    if (!formato) {
      throw new Error(
        `OpenRouter no acepta audio ${audio.mimeType} (solo ${Object.values(
          new Set(Object.values(FORMATOS)),
        ).join(", ")}). Para grabar desde el navegador conviene OpenAI.`,
      );
    }

    const instruccion = [
      "Transcribí el audio palabra por palabra, en el idioma en que está hablado.",
      "Devolvé SOLO la transcripción: sin encabezados, sin comentarios, sin resumir y sin traducir.",
      "Marcá los cambios de interlocutor con un guion al principio de la línea.",
      opciones?.contexto ? `Contexto: ${opciones.contexto}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const cuerpo = {
      model: this.modelo,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruccion },
            {
              type: "input_audio",
              input_audio: {
                data: Buffer.from(audio.contenido).toString("base64"),
                format: formato,
              },
            },
          ],
        },
      ],
    };

    const respuesta = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "X-Title": "Consultorio",
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new Error(
        `OpenRouter respondió ${respuesta.status}. ${detalle.slice(0, 300)}`,
      );
    }

    const json = (await respuesta.json()) as RespuestaOpenRouter;
    if (json.error) {
      throw new Error(json.error.message ?? "Error de OpenRouter.");
    }
    return (json.choices?.[0]?.message?.content ?? "").trim();
  }
}

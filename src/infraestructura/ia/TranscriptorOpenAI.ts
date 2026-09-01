import type {
  AudioParaTranscribir,
  ITranscriptorAudio,
  OpcionesTranscripcion,
} from "@/dominio/servicios/ITranscriptorAudio";

const URL = "https://api.openai.com/v1/audio/transcriptions";

/**
 * Un audio de una hora tarda del orden del minuto en volver. El límite es
 * generoso porque el que corre esto es el worker, no una request del navegador:
 * nadie está esperando del otro lado, y cortar a los 45 s tiraría trabajo que
 * estaba por terminar.
 */
const TIEMPO_LIMITE_MS = 10 * 60 * 1000;

interface RespuestaOpenAI {
  text?: string;
  error?: { message?: string };
}

/**
 * Voz a texto con la API de OpenAI (`/v1/audio/transcriptions`).
 *
 * Manda el audio como `multipart/form-data`, que es lo único que ese endpoint
 * acepta —no hay variante JSON con base64—.
 *
 * El tope de 25 MB por archivo es del proveedor, y está replicado en el
 * contexto `grabacion` de `CONTEXTOS_ARCHIVO`: se rechaza al SUBIR y no acá,
 * porque acá el profesional ya se fue de la consulta y el error no lo ve nadie.
 */
export class TranscriptorOpenAI implements ITranscriptorAudio {
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
    const formulario = new FormData();
    formulario.append(
      "file",
      new Blob([audio.contenido as unknown as BlobPart], {
        type: audio.mimeType,
      }),
      audio.nombreArchivo,
    );
    formulario.append("model", this.modelo);
    formulario.append("response_format", "json");
    if (opciones?.idioma) formulario.append("language", opciones.idioma);
    // `prompt` no es una instrucción: es un texto de ejemplo que sesga el
    // reconocimiento hacia ese vocabulario. Sirve para los nombres propios y
    // los términos técnicos que el modelo escribiría fonéticamente.
    if (opciones?.contexto) formulario.append("prompt", opciones.contexto);

    const respuesta = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formulario,
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new Error(
        `OpenAI respondió ${respuesta.status}. ${detalle.slice(0, 300)}`,
      );
    }

    const json = (await respuesta.json()) as RespuestaOpenAI;
    if (json.error) {
      throw new Error(json.error.message ?? "Error de OpenAI.");
    }
    return (json.text ?? "").trim();
  }
}

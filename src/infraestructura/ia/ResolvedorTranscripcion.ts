import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type {
  AudioParaTranscribir,
  ITranscriptorAudio,
  OpcionesTranscripcion,
} from "@/dominio/servicios/ITranscriptorAudio";
import { TranscriptorOpenAI } from "./TranscriptorOpenAI";
import { TranscriptorOpenRouter } from "./TranscriptorOpenRouter";
import { TranscriptorStub } from "./TranscriptorStub";

/**
 * Modelo por defecto de cada proveedor.
 *
 * En OpenAI, `gpt-4o-transcribe` es el sucesor de `whisper-1` y anda bastante
 * mejor con el español rioplatense. En OpenRouter no hay endpoint de
 * transcripción, así que el defecto es un modelo de chat que escucha (ver
 * `TranscriptorOpenRouter`).
 */
const MODELO_OPENAI = "gpt-4o-transcribe";
const MODELO_OPENROUTER = "google/gemini-2.5-flash";

/**
 * Resuelve el transcriptor del inquilino en curso.
 *
 * Es la misma mecánica que `ResolvedorConfigIA` —credenciales por consultorio,
 * caída a variable de entorno, stub si no hay nada— pero con su propia clave y
 * su propio proveedor: transcribir y conversar son capacidades distintas, y el
 * proveedor de IA por defecto de la app (Anthropic) no transcribe audio.
 *
 * Se cachea por (proveedor, clave, modelo) para no reconstruir el adaptador en
 * cada grabación.
 */
export class ResolvedorTranscripcion implements ITranscriptorAudio {
  private readonly cache = new Map<string, ITranscriptorAudio>();
  private readonly stub = new TranscriptorStub();

  constructor(
    private readonly credenciales: ICredencialesIntegracionRepositorio,
  ) {}

  async estaConfigurado(): Promise<boolean> {
    return (await this.resolver()) !== null;
  }

  async transcribir(
    audio: AudioParaTranscribir,
    opciones?: OpcionesTranscripcion,
  ): Promise<string> {
    return (await this.obtener()).transcribir(audio, opciones);
  }

  private async obtener(): Promise<ITranscriptorAudio> {
    const r = await this.resolver();
    if (!r) return this.stub;

    const clave = `${r.proveedor}:${r.apiKey}:${r.modelo}`;
    let transcriptor = this.cache.get(clave);
    if (!transcriptor) {
      transcriptor =
        r.proveedor === "OPENROUTER"
          ? new TranscriptorOpenRouter(r.apiKey, r.modelo)
          : new TranscriptorOpenAI(r.apiKey, r.modelo);
      this.cache.set(clave, transcriptor);
    }
    return transcriptor;
  }

  private async resolver(): Promise<{
    proveedor: "OPENAI" | "OPENROUTER";
    apiKey: string;
    modelo: string;
  } | null> {
    try {
      const c = await this.credenciales.obtener();
      if (c?.transcripcionApiKey) {
        const proveedor =
          c.proveedorTranscripcion === "OPENROUTER" ? "OPENROUTER" : "OPENAI";
        return {
          proveedor,
          apiKey: c.transcripcionApiKey,
          modelo:
            c.transcripcionModelo ??
            (proveedor === "OPENROUTER" ? MODELO_OPENROUTER : MODELO_OPENAI),
        };
      }
    } catch {
      // Sin alcance de inquilino o error de lectura → probamos el entorno.
    }

    // Caída a variable de entorno, para el despliegue de un solo consultorio
    // que prefiere no cargar la clave por pantalla.
    const apiKey = process.env.OPENAI_API_KEY;
    return apiKey
      ? {
          proveedor: "OPENAI",
          apiKey,
          modelo: process.env.OPENAI_TRANSCRIPCION_MODELO ?? MODELO_OPENAI,
        }
      : null;
  }
}

import type { IConfiguracionIAGlobalRepositorio } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type { IRegistroUsoIARepositorio } from "@/dominio/repositorios/IRegistroUsoIARepositorio";
import type {
  AudioParaTranscribir,
  ITranscriptorAudio,
  OpcionesTranscripcion,
} from "@/dominio/servicios/ITranscriptorAudio";
import { TranscriptorOpenAI } from "./TranscriptorOpenAI";
import { TranscriptorOpenRouter } from "./TranscriptorOpenRouter";
import { TranscriptorStub } from "./TranscriptorStub";
import { anotarUso } from "./registroUso";

/**
 * Modelo por defecto de cada proveedor.
 *
 * En OpenAI, `gpt-4o-transcribe` es el sucesor de `whisper-1` y anda bastante
 * mejor con el español rioplatense. En OpenRouter no hay endpoint de
 * transcripción, así que el defecto es un modelo de chat que escucha (ver
 * `TranscriptorOpenRouter`).
 */
export const MODELO_TRANSCRIPCION_OPENAI = "gpt-4o-transcribe";
export const MODELO_TRANSCRIPCION_OPENROUTER = "google/gemini-2.5-flash";

type Transcriptor = TranscriptorOpenAI | TranscriptorOpenRouter;

interface Resuelto {
  proveedor: "OPENAI" | "OPENROUTER";
  apiKey: string;
  modelo: string;
}

/**
 * Resuelve el transcriptor de la plataforma.
 *
 * Es la misma mecánica que `ResolvedorConfigIA` —configuración de la
 * plataforma, caída a variable de entorno, stub si no hay nada— pero con su
 * propio proveedor: transcribir y conversar son capacidades distintas, y el
 * proveedor de IA por defecto de la app (Anthropic) no transcribe audio. La
 * CLAVE sí puede ser la misma: la de OpenRouter sirve para las dos cosas.
 *
 * Cada transcripción queda en el registro de uso. Se cachea por (proveedor,
 * clave, modelo) para no reconstruir el adaptador en cada grabación.
 */
export class ResolvedorTranscripcion implements ITranscriptorAudio {
  private readonly cache = new Map<string, Transcriptor>();
  private readonly stub = new TranscriptorStub();

  constructor(
    private readonly configuracion: IConfiguracionIAGlobalRepositorio,
    private readonly registro: IRegistroUsoIARepositorio,
  ) {}

  async estaConfigurado(): Promise<boolean> {
    return (await this.resolver()) !== null;
  }

  async transcribir(
    audio: AudioParaTranscribir,
    opciones?: OpcionesTranscripcion,
  ): Promise<string> {
    const r = await this.resolver();
    // El stub lanza a propósito: sin clave no hay transcripción inventada.
    if (!r) return this.stub.transcribir(audio);

    const inicio = Date.now();
    try {
      const { texto, consumo } = await this.obtener(r).transcribirConConsumo(
        audio,
        opciones,
      );
      await anotarUso(this.registro, {
        capacidad: "TRANSCRIPCION",
        proveedor: r.proveedor,
        modelo: r.modelo,
        operacion: "transcribir",
        ...consumo,
        exito: true,
        error: null,
        duracionMs: Date.now() - inicio,
      });
      return texto;
    } catch (error) {
      await anotarUso(this.registro, {
        capacidad: "TRANSCRIPCION",
        proveedor: r.proveedor,
        modelo: r.modelo,
        operacion: "transcribir",
        tokensEntrada: 0,
        tokensSalida: 0,
        costoUsd: null,
        exito: false,
        error: error instanceof Error ? error.message : String(error),
        duracionMs: Date.now() - inicio,
      });
      throw error;
    }
  }

  private obtener(r: Resuelto): Transcriptor {
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

  private async resolver(): Promise<Resuelto | null> {
    try {
      const c = await this.configuracion.obtener();
      const proveedor = c.proveedorTranscripcion;
      const apiKey = c.claves[proveedor];
      if (apiKey) {
        return {
          proveedor,
          apiKey,
          modelo:
            c.modeloTranscripcion ??
            (proveedor === "OPENROUTER"
              ? MODELO_TRANSCRIPCION_OPENROUTER
              : MODELO_TRANSCRIPCION_OPENAI),
        };
      }
    } catch (error) {
      console.error(
        "[transcripcion] no se pudo leer la configuración de IA:",
        error,
      );
    }

    // Caída a variable de entorno, para el despliegue que prefiere no cargar
    // la clave por pantalla.
    const apiKey = process.env.OPENAI_API_KEY;
    return apiKey
      ? {
          proveedor: "OPENAI",
          apiKey,
          modelo:
            process.env.OPENAI_TRANSCRIPCION_MODELO ??
            MODELO_TRANSCRIPCION_OPENAI,
        }
      : null;
  }
}

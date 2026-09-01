import type {
  AudioParaTranscribir,
  ITranscriptorAudio,
} from "@/dominio/servicios/ITranscriptorAudio";

/**
 * Adaptador STUB de voz a texto: el que corre cuando no hay proveedor
 * configurado.
 *
 * **LANZA en vez de devolver un texto de demostración.** Es la diferencia con
 * el resto de los stubs de IA de la app, y es deliberada: un chat de
 * demostración se lee como una demostración, pero una transcripción falsa
 * guardada en la ficha de un paciente es un registro clínico inventado, y el
 * resumen que salga de ella lo va a parecer todavía más.
 *
 * El error deja la grabación FALLIDA con el motivo a la vista, el audio queda
 * guardado, y cargar la clave más tarde permite reintentar sin perder nada.
 */
export class TranscriptorStub implements ITranscriptorAudio {
  async estaConfigurado(): Promise<boolean> {
    return false;
  }

  async transcribir(_audio: AudioParaTranscribir): Promise<string> {
    throw new Error(
      "No hay proveedor de voz a texto configurado. Cargá la clave en Integraciones y reintentá la transcripción: el audio quedó guardado.",
    );
  }
}

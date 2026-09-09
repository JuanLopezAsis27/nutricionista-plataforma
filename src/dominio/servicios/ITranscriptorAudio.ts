/**
 * Puerto de voz a texto, agnóstico al proveedor.
 *
 * Existe aparte de `IProveedorLLM` porque son dos capacidades distintas y no
 * las cubre el mismo vendor: Anthropic —el proveedor de IA por defecto de la
 * app— no transcribe audio. Atarlas habría dejado la grabación sin funcionar
 * para quien tiene la IA configurada con Claude, que es el caso normal.
 */

/** El audio a transcribir, tal como salió del bucket. */
export interface AudioParaTranscribir {
  contenido: Uint8Array;
  /** Nombre con extensión: varios proveedores deducen el formato de acá. */
  nombreArchivo: string;
  mimeType: string;
}

export interface OpcionesTranscripcion {
  /** Código ISO-639-1 ("es"). Acota el reconocimiento y mejora bastante. */
  idioma?: string;
  /**
   * Contexto para orientar la transcripción: nombres propios y vocabulario que
   * el modelo no adivina (marcas de suplementos, sitios antropométricos).
   */
  contexto?: string;
}

export interface ITranscriptorAudio {
  /** Texto plano del audio. Lanza ante error del proveedor. */
  transcribir(
    audio: AudioParaTranscribir,
    opciones?: OpcionesTranscripcion,
  ): Promise<string>;
  /** true si hay un proveedor real detrás (no el stub de demostración). */
  estaConfigurado(): Promise<boolean>;
}

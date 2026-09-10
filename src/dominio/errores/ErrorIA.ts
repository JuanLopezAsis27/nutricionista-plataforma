import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * La IA está configurada pero no pudo responder.
 *
 * Es un error propio y no un 500 genérico porque casi siempre es un problema de
 * CONFIGURACIÓN que el profesional puede arreglar solo —un modelo mal escrito,
 * una clave vencida, un modelo sin visión al que se le manda una foto— y para
 * eso el mensaje del proveedor tiene que llegar hasta la pantalla. Antes estas
 * fallas se tragaban y se devolvía la respuesta de demostración, así que la
 * única señal de que la IA no había contestado era que la respuesta parecía
 * inventada.
 */
export class ErrorIA extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "IA_NO_DISPONIBLE";

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/**
 * Envuelve lo que haya fallado en un `ErrorIA` con contexto, y lo registra.
 *
 * `contexto` dice QUÉ se estaba haciendo ("El análisis de la foto"), porque el
 * mensaje del proveedor por sí solo ("OpenRouter respondió 400…") no ubica al
 * profesional en qué parte de la app hay que tocar.
 */
export function comoErrorIA(contexto: string, causa: unknown): ErrorIA {
  console.error(`[ia] ${contexto} falló:`, causa);
  const detalle = causa instanceof Error ? causa.message : String(causa);
  return new ErrorIA(`${contexto} falló. ${detalle}`);
}

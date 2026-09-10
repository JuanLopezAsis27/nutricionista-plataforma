/**
 * Avance de una respuesta de IA mientras se está generando.
 *
 * Existe para que el chat pueda mostrar la respuesta A MEDIDA que el modelo la
 * escribe, en vez de una pantalla de «pensando…» de veinte segundos seguida de
 * un bloque de texto entero. Es un puerto del dominio y no un detalle del
 * transporte: el adaptador de IA lo emite, el caso de uso lo pasa tal cual y la
 * capa de presentación decide cómo se ve.
 *
 * `herramienta` no es decorativo: cuando el modelo llama a una herramienta,
 * TODO el texto que venía escribiendo antes queda descartado —ese turno se
 * reemplaza por la llamada— así que quien pinta la respuesta parcial tiene que
 * borrar lo acumulado al recibirlo. Sin este aviso, la pantalla se quedaría con
 * un texto que la respuesta final no contiene.
 */
export type AvanceIA =
  { tipo: "texto"; texto: string } | { tipo: "herramienta"; nombre: string };

/** Callback opcional que reciben los adaptadores para ir emitiendo el avance. */
export type AlAvanzarIA = (avance: AvanceIA) => void;

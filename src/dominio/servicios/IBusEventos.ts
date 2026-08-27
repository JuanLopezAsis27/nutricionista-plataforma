/**
 * Evento de tiempo real dirigido a un usuario concreto. `tipo` identifica la
 * clase de evento ("mensaje.nuevo", "alerta.nueva"…); `datos` lleva contexto
 * opcional (ej. conversacionId) para que el cliente sepa qué invalidar.
 */
export interface EventoTiempoReal {
  tipo: string;
  usuarioId: string;
  datos?: Record<string, unknown>;
}

/**
 * Evento que avisa que el bus perdió y recuperó la conexión.
 *
 * No lo publica ningún caso de uso: lo genera el adaptador al reconectarse.
 * Importa porque el transporte no reintrega lo perdido — los eventos emitidos
 * mientras la escucha estaba caída no llegan nunca —, así que el cliente que
 * lo recibe sabe que tiene un hueco y debe re-sincronizar su estado.
 *
 * Vive en el puerto (y no en el adaptador) porque es vocabulario de eventos,
 * compartido con la presentación: un hook del navegador no puede importar el
 * adaptador sin arrastrar el driver de Postgres al bundle.
 */
export const TIPO_RECONEXION = "bus.reconectado";

/**
 * Puerto de bus de eventos en tiempo real (pub/sub). Permite que los casos de
 * uso empujen eventos a un usuario sin conocer el transporte (SSE) ni el
 * mecanismo entre procesos (Postgres LISTEN/NOTIFY). La app lo consume desde
 * una subscription tRPC; el worker solo publica.
 */
export interface IBusEventos {
  /** Publica un evento (llega a todos los procesos suscritos). */
  publicar(evento: EventoTiempoReal): Promise<void>;
  /**
   * Flujo de eventos destinados a `usuarioId`, hasta que `signal` se aborte
   * (el cliente cerró la conexión SSE).
   */
  suscribir(
    usuarioId: string,
    signal: AbortSignal,
  ): AsyncIterable<EventoTiempoReal>;
}

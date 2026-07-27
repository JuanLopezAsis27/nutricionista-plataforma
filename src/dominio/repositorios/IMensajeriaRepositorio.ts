import type { Conversacion } from "../entidades/Conversacion";
import type { Mensaje } from "../entidades/Mensaje";

/** Resumen de una conversación para el listado del nutricionista. */
export interface ResumenConversacion {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  ultimoMensajeTexto: string | null;
  ultimoMensajeEn: Date | null;
  noLeidos: number;
}

/**
 * Contrato de persistencia de la mensajería (conversación + mensajes juntos:
 * están fuertemente acoplados y varias lecturas cruzan ambos).
 *
 * "No leídos" siempre se cuenta como mensajes con `leidoEn` null cuyo autor
 * NO es el que mira (`viewerId`): así cada extremo ve lo que le falta leer.
 */
export interface IMensajeriaRepositorio {
  obtenerConversacionPorId(id: string): Promise<Conversacion | null>;
  obtenerConversacionPorPaciente(pacienteId: string): Promise<Conversacion | null>;
  crearConversacion(conversacion: Conversacion): Promise<Conversacion>;
  actualizarConversacion(conversacion: Conversacion): Promise<Conversacion>;
  /** Todas las conversaciones con nombre del paciente, último mensaje y no-leídos para `viewerId`. */
  listarResumen(viewerId: string): Promise<ResumenConversacion[]>;

  crearMensaje(mensaje: Mensaje): Promise<Mensaje>;
  listarMensajes(conversacionId: string, limite?: number): Promise<Mensaje[]>;
  /** Marca como leídos los mensajes de la conversación no escritos por `viewerId`. */
  marcarLeidos(conversacionId: string, viewerId: string, ahora: Date): Promise<void>;
  /** Cantidad de no-leídos para `viewerId`; si se pasa conversación, solo la de esa. */
  contarNoLeidos(viewerId: string, conversacionId?: string): Promise<number>;
}

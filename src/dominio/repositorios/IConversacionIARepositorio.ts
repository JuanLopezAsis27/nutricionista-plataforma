import type { ConversacionIA, MensajeIA } from "../entidades/ConversacionIA";

/** Fila del listado de conversaciones (sin traer los mensajes). */
export interface ResumenConversacionIA {
  id: string;
  titulo: string;
  cantidadMensajes: number;
  actualizadoEn: Date;
}

/**
 * Contrato de persistencia de los chats con el asistente. Son del inquilino, y
 * adentro de él pueden ser del profesional o de un paciente (ver
 * `ConversacionIA`).
 */
export interface IConversacionIARepositorio {
  crear(conversacion: ConversacionIA): Promise<void>;
  /** Suma un turno y adelanta la fecha de actualización de la conversación. */
  agregarMensaje(conversacionId: string, mensaje: MensajeIA): Promise<void>;
  obtenerPorId(id: string): Promise<ConversacionIA | null>;
  /**
   * Listado para la barra lateral, de la más reciente a la más vieja. No trae
   * los mensajes: la lista solo muestra título y fecha, y traer el contenido
   * de 50 conversaciones para pintar 50 títulos es leer de más en cada carga.
   *
   * `pacienteId` es OBLIGATORIO aunque admita null, y ese null significa «las
   * del profesional», no «todas»: un parámetro opcional que devolviera todo al
   * omitirlo habría hecho que el olvido más fácil de cometer —no pasarlo—
   * fuera justo el que mezcla los chats de los pacientes con los del
   * consultorio.
   */
  listar(
    limite: number,
    pacienteId: string | null,
  ): Promise<ResumenConversacionIA[]>;
  eliminar(id: string): Promise<void>;
}

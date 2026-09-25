import type { MensajeWhatsapp } from "../entidades/MensajeWhatsapp";

/** El chat de WhatsApp de un paciente, resumido para la bandeja de Mensajes. */
export interface ResumenWhatsappPaciente {
  pacienteId: string;
  ultimoMensajeTexto: string;
  ultimoMensajeEn: Date;
  /** Entrantes que el profesional todavía no leyó. */
  noLeidos: number;
}

/** Contrato de persistencia del hilo de WhatsApp con los pacientes. */
export interface IMensajeWhatsappRepositorio {
  crear(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp>;
  actualizar(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp>;
  /** Busca por el wamid de Meta, para correlacionar los webhooks de estado. */
  obtenerPorIdExterno(idExterno: string): Promise<MensajeWhatsapp | null>;
  /** Hilo de un paciente, del más viejo al más nuevo. */
  listarPorPaciente(
    pacienteId: string,
    limite?: number,
  ): Promise<MensajeWhatsapp[]>;
  /**
   * Último mensaje ENTRANTE del paciente: marca el inicio de la ventana de
   * 24 h en la que Meta permite escribir texto libre.
   */
  ultimoEntrante(pacienteId: string): Promise<MensajeWhatsapp | null>;
  /**
   * Último mensaje de cada paciente pedido, indexado por pacienteId. Lo usa la
   * bandeja de seguimiento para mostrar de qué venía cada chat sin pedir un
   * hilo por fila.
   */
  ultimosPorPacientes(
    pacienteIds: string[],
  ): Promise<Map<string, MensajeWhatsapp>>;
  /**
   * Último mensaje ENTRANTE de cada paciente pedido. Es lo que responde las
   * dos preguntas de la bandeja: si contestó, y si la ventana de 24 h sigue
   * abierta para escribirle texto libre.
   */
  ultimosEntrantesPorPacientes(
    pacienteIds: string[],
  ): Promise<Map<string, MensajeWhatsapp>>;
  /**
   * Entrantes sin leer: los de un paciente, o los de todo el consultorio sin
   * `pacienteId` (el número del sidebar).
   */
  contarNoLeidos(pacienteId?: string): Promise<number>;
  /** Marca leídos los entrantes del paciente. Devuelve cuántos marcó. */
  marcarLeidos(pacienteId: string, leidoEn: Date): Promise<number>;
  /** Un resumen por cada paciente con mensajes de WhatsApp. */
  resumenPorPaciente(): Promise<ResumenWhatsappPaciente[]>;
}

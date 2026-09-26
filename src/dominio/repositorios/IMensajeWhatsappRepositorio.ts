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
  /**
   * El hilo de la ficha, del más viejo al más nuevo. Con `telefono`, además todos los mensajes de ese
   * número aunque estén en otra ficha (migración 81): cuando varias fichas
   * comparten un número —dos hermanos con el de la madre— la conversación es
   * UNA, con la madre, y se ve entera desde cualquiera de ellas.
   */
  listarPorPaciente(
    pacienteId: string,
    limite?: number,
    telefono?: string | null,
  ): Promise<MensajeWhatsapp[]>;
  /**
   * Último mensaje ENTRANTE del paciente: marca el inicio de la ventana de
   * 24 h en la que Meta permite escribir texto libre.
   */
  ultimoEntrante(
    pacienteId: string,
    /** La ventana de Meta es del NÚMERO: con él, cuenta cualquier ficha. */
    telefono?: string | null,
  ): Promise<MensajeWhatsapp | null>;
  /**
   * Último mensaje SALIENTE a ese número, de cualquier ficha. Es la pista de
   * con quién venía la conversación cuando el número lo comparten varias
   * fichas (ver `elegirFichaDelTelefono`).
   */
  ultimoSalienteAlTelefono(telefono: string): Promise<MensajeWhatsapp | null>;
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
  /** Con `telefono`, también los de ese número en otras fichas. */
  marcarLeidos(
    pacienteId: string,
    leidoEn: Date,
    telefono?: string | null,
  ): Promise<number>;
  /** Un resumen por cada paciente con mensajes de WhatsApp. */
  resumenPorPaciente(): Promise<ResumenWhatsappPaciente[]>;
}

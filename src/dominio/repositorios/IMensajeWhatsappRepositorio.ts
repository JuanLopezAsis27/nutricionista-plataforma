import type { MensajeWhatsapp } from "../entidades/MensajeWhatsapp";

/** Contrato de persistencia del hilo de WhatsApp con los pacientes. */
export interface IMensajeWhatsappRepositorio {
  crear(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp>;
  actualizar(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp>;
  /** Busca por el wamid de Meta, para correlacionar los webhooks de estado. */
  obtenerPorIdExterno(idExterno: string): Promise<MensajeWhatsapp | null>;
  /** Hilo de un paciente, del más viejo al más nuevo. */
  listarPorPaciente(pacienteId: string, limite?: number): Promise<MensajeWhatsapp[]>;
  /**
   * Último mensaje ENTRANTE del paciente: marca el inicio de la ventana de
   * 24 h en la que Meta permite escribir texto libre.
   */
  ultimoEntrante(pacienteId: string): Promise<MensajeWhatsapp | null>;
}

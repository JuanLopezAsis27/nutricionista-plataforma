/** Mensaje a hacer llegar a un paciente por WhatsApp. */
export interface MensajeWhatsapp {
  /** Teléfono en E.164 sin "+". */
  telefono: string;
  texto: string;
}

/** Resultado de preparar (o enviar) un mensaje de WhatsApp. */
export interface ResultadoEnvioWhatsapp {
  /** ENLACE: hay que abrir wa.me a mano. API: el proveedor ya lo envió. */
  modo: "ENLACE" | "API";
  /** Enlace wa.me a abrir, cuando modo = ENLACE. */
  enlace?: string;
  /** Id del mensaje en el proveedor, cuando modo = API. */
  idExterno?: string;
}

/**
 * Puerto de salida para WhatsApp.
 *
 * Hoy la única implementación arma un enlace wa.me (el profesional envía a
 * mano). Cuando entre la Cloud API oficial, otra implementación enviará de
 * verdad detrás de este mismo contrato, sin tocar los casos de uso.
 */
export interface IProveedorWhatsapp {
  preparar(mensaje: MensajeWhatsapp): Promise<ResultadoEnvioWhatsapp>;
  /**
   * Modo con el que trabaja el inquilino actual. La UI lo usa para decidir si
   * ofrece el hilo de WhatsApp dentro de la app o solo el enlace wa.me.
   */
  modoActual(): Promise<"ENLACE" | "API">;
}

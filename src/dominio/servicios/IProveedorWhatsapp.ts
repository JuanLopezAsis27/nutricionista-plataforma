/** Mensaje a hacer llegar a un paciente por WhatsApp. */
export interface MensajeWhatsapp {
  /** Teléfono en E.164 sin "+". */
  telefono: string;
  texto: string;
}

/**
 * Envío de una plantilla APROBADA en Meta.
 *
 * Es un método aparte y no una variante de `preparar` porque la Cloud API lo
 * trata como otra cosa: fuera de la ventana de 24 h desde el último mensaje
 * del paciente rechaza el texto libre, y un recordatorio de turno casi siempre
 * cae fuera de esa ventana. Los parámetros van POR POSICIÓN —Meta los numera
 * {{1}}, {{2}}…, no los nombra—, así que el orden del array es el contrato.
 *
 * `textoEquivalente` es el mismo mensaje ya renderizado en castellano: sirve
 * para el enlace wa.me cuando no hay API conectada y para dejarlo en el log de
 * auditoría, que tiene que decir qué leyó el paciente y no `plantilla_turno`.
 */
export interface PlantillaWhatsappEnvio {
  telefono: string;
  nombrePlantilla: string;
  idioma: string;
  parametros: string[];
  textoEquivalente: string;
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
 * Dos implementaciones detrás del mismo contrato: una arma un enlace wa.me
 * (el profesional envía a mano) y otra habla con la Cloud API oficial. Que la
 * elección viva acá abajo es lo que permite que la app funcione igual con o
 * sin número dado de alta en Meta: el resto del código no se entera de cuál de
 * las dos está atendiendo.
 */
export interface IProveedorWhatsapp {
  preparar(mensaje: MensajeWhatsapp): Promise<ResultadoEnvioWhatsapp>;
  /**
   * Envía una plantilla aprobada. La implementación por enlace degrada al
   * wa.me con `textoEquivalente`: no hay plantillas que aprobar cuando el
   * mensaje lo manda una persona desde su teléfono.
   */
  enviarPlantilla(
    envio: PlantillaWhatsappEnvio,
  ): Promise<ResultadoEnvioWhatsapp>;
  /**
   * Modo con el que trabaja el inquilino actual. La UI lo usa para decidir si
   * ofrece el hilo de WhatsApp dentro de la app o solo el enlace wa.me.
   */
  modoActual(): Promise<"ENLACE" | "API">;
}

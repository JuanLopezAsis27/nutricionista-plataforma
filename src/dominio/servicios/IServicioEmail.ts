/** Mensaje de correo saliente. */
export interface MensajeEmail {
  para: string;
  asunto: string;
  html: string;
  texto?: string;
}

/**
 * Puerto de envío de emails. La implementación concreta (SMTP/Nodemailer,
 * y en el futuro la API de Gmail) vive en infraestructura.
 */
export interface IServicioEmail {
  enviar(mensaje: MensajeEmail): Promise<void>;
}

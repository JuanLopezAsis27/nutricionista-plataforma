import nodemailer, { type Transporter } from "nodemailer";
import type { IServicioEmail, MensajeEmail } from "@/dominio/servicios/IServicioEmail";

/**
 * Implementación SMTP del puerto de email (Nodemailer).
 * En desarrollo apunta al Mailpit de docker-compose (localhost:1025, sin
 * auth); en producción a un SMTP real vía variables de entorno.
 */
export class NodemailerServicioEmail implements IServicioEmail {
  private readonly transporte: Transporter;
  private readonly remitente: string;

  constructor() {
    this.remitente = process.env.EMAIL_FROM ?? "no-responder@localhost";
    this.transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }

  async enviar(mensaje: MensajeEmail): Promise<void> {
    await this.transporte.sendMail({
      from: this.remitente,
      to: mensaje.para,
      subject: mensaje.asunto,
      html: mensaje.html,
      text: mensaje.texto,
    });
  }
}

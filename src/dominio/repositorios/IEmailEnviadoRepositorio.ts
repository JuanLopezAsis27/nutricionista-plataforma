import type { EmailEnviado } from "../entidades/EmailEnviado";

/** Contrato de persistencia del log de emails enviados. */
export interface IEmailEnviadoRepositorio {
  registrar(email: EmailEnviado): Promise<void>;
  /**
   * Indica si ya se envió un email de esa plantilla para esa referencia
   * (ej. un recordatorio para un turno concreto). Base de la idempotencia.
   */
  yaEnviado(plantillaClave: string, referenciaId: string): Promise<boolean>;
  /** Últimos envíos registrados (para auditoría en la UI). */
  listarRecientes(limite?: number): Promise<EmailEnviado[]>;
}

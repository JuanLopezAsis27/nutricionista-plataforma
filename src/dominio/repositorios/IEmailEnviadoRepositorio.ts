import type { EmailEnviado } from "../entidades/EmailEnviado";

/** Contrato de persistencia del log de emails enviados. */
export interface IEmailEnviadoRepositorio {
  registrar(email: EmailEnviado): Promise<void>;
  /**
   * Indica si ya se envió un email de esa plantilla para esa referencia
   * (ej. un recordatorio para un turno concreto). Base de la idempotencia.
   */
  yaEnviado(plantillaClave: string, referenciaId: string): Promise<boolean>;
  /**
   * Cuándo salió el último email de esa plantilla para ese turno, mirando
   * TODAS sus referencias (el escalón de 1 día usa el turnoId pelado, los
   * demás lo llevan con sufijo). Es lo que mide el margen antes de repetir un
   * aviso: `yaEnviado` solo dice sí o no, y "ya se le avisó" dejó de ser una
   * condición definitiva.
   */
  ultimoEnviadoParaTurno(
    plantillaClave: string,
    turnoId: string,
  ): Promise<Date | null>;
  /** Últimos envíos registrados (para auditoría en la UI). */
  listarRecientes(limite?: number): Promise<EmailEnviado[]>;
}

import type { IEmailEnviadoRepositorio } from "../../repositorios/IEmailEnviadoRepositorio";
import type { EmailEnviado } from "../../entidades/EmailEnviado";

/** Caso de uso: listar los últimos emails enviados (auditoría). */
export class ListarEmailsEnviados {
  constructor(private readonly emails: IEmailEnviadoRepositorio) {}

  async ejecutar(limite = 30): Promise<EmailEnviado[]> {
    return this.emails.listarRecientes(limite);
  }
}

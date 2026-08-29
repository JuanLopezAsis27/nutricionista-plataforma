import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { ErrorRecordatorioNoEncontrado } from "../../errores/ErrorRecordatorioNoEncontrado";

/**
 * Caso de uso: el profesional declara si finalmente envió el recordatorio.
 *
 * Es el único modo de saberlo mientras el canal sea un enlace wa.me; con la
 * API oficial lo dice el webhook de entrega y esta declaración sobra.
 *
 * Ojo con el vocabulario: acá "confirmar" es que el MENSAJE salió, no que el
 * paciente venga al turno. Lo segundo es el estado CONFIRMADO, y lo pone la
 * respuesta del paciente.
 */
export class ConfirmarRecordatorioWhatsapp {
  constructor(private readonly recordatorios: IRecordatorioWhatsappRepositorio) {}

  async ejecutar(id: string, enviado: boolean): Promise<RecordatorioWhatsapp> {
    const recordatorio = await this.recordatorios.obtenerPorId(id);
    if (!recordatorio) {
      throw new ErrorRecordatorioNoEncontrado(id);
    }
    // La entidad impide re-resolver uno ya confirmado o descartado.
    const resuelto = enviado ? recordatorio.confirmarEnvio() : recordatorio.descartar();
    return this.recordatorios.actualizar(resuelto);
  }
}

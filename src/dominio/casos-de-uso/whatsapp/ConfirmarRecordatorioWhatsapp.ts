import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { ErrorRecordatorioNoEncontrado } from "../../errores/ErrorRecordatorioNoEncontrado";

/**
 * Caso de uso: el profesional declara si finalmente envió el recordatorio.
 *
 * Es el único modo de saberlo mientras el canal sea un enlace wa.me; con la
 * API oficial lo dirá el webhook de entrega y esta confirmación sobra.
 */
export class ConfirmarRecordatorioWhatsapp {
  constructor(private readonly recordatorios: IRecordatorioWhatsappRepositorio) {}

  async ejecutar(id: string, enviado: boolean): Promise<RecordatorioWhatsapp> {
    const recordatorio = await this.recordatorios.obtenerPorId(id);
    if (!recordatorio) {
      throw new ErrorRecordatorioNoEncontrado(id);
    }
    // La entidad impide re-resolver uno ya confirmado o descartado.
    const resuelto = enviado ? recordatorio.confirmar() : recordatorio.descartar();
    return this.recordatorios.actualizar(resuelto);
  }
}

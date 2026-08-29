import type { ListarSeguimientoRecordatorios } from "@/dominio/casos-de-uso/recordatorios/ListarSeguimientoRecordatorios";
import type { ListarRecordatoriosPendientes } from "@/dominio/casos-de-uso/recordatorios/ListarRecordatoriosPendientes";
import type { ConfirmarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/recordatorios/ConfirmarRecordatorioWhatsapp";
import type {
  RecordatorioPendienteSalidaDto,
  RecordatorioSalidaDto,
  SeguimientoRecordatorioSalidaDto,
} from "../../dtos/recordatorios.dto";

/**
 * Qué pasó con lo que se mandó: el seguimiento y la confirmación manual.
 *
 * Van juntos porque responden la misma pregunta desde dos lados. La
 * confirmación es la contracara del enlace `wa.me`: la app abre el chat pero
 * WhatsApp no le devuelve nada, así que el envío lo declara el profesional y
 * necesita dónde hacerlo.
 */
export class ServicioSeguimientoRecordatorios {
  constructor(
    private readonly seguimientoUC: ListarSeguimientoRecordatorios,
    private readonly pendientesUC: ListarRecordatoriosPendientes,
    private readonly confirmarUC: ConfirmarRecordatorioWhatsapp,
  ) {}

  async listarSeguimiento(
    limite?: number,
  ): Promise<SeguimientoRecordatorioSalidaDto[]> {
    return this.seguimientoUC.ejecutar(limite);
  }

  /** Los recordatorios por enlace que quedaron sin confirmar. */
  async listarPendientes(): Promise<RecordatorioPendienteSalidaDto[]> {
    return this.pendientesUC.ejecutar();
  }

  async confirmarEnvio(
    recordatorioId: string,
    enviado: boolean,
  ): Promise<RecordatorioSalidaDto> {
    const recordatorio = await this.confirmarUC.ejecutar(
      recordatorioId,
      enviado,
    );
    const d = recordatorio.aPrimitivos();
    return {
      id: d.id,
      estado: d.estado,
      creadoEn: d.creadoEn,
      confirmadoEn: d.confirmadoEn,
    };
  }
}

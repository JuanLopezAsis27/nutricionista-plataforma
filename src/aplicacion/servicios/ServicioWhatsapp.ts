import type { ObtenerVistaPreviaRecordatorio } from "@/dominio/casos-de-uso/whatsapp/ObtenerVistaPreviaRecordatorio";
import type { PrepararRecordatorioWhatsapp } from "@/dominio/casos-de-uso/whatsapp/PrepararRecordatorioWhatsapp";
import type { ConfirmarRecordatorioWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ConfirmarRecordatorioWhatsapp";
import type { ObtenerHiloWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ObtenerHiloWhatsapp";
import type { EnviarMensajeWhatsapp } from "@/dominio/casos-de-uso/whatsapp/EnviarMensajeWhatsapp";
import type {
  ProcesarMensajeEntranteWhatsapp,
  MensajeEntranteWhatsapp,
} from "@/dominio/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import type {
  RegistrarEstadoWhatsapp,
  EstadoEntregaWhatsapp,
} from "@/dominio/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import type { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import type { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import type {
  ConfirmarRecordatorioDto,
  PrepararRecordatorioDto,
  RecordatorioPreparadoSalidaDto,
  RecordatorioSalidaDto,
  VistaPreviaSalidaDto,
  HiloWhatsappSalidaDto,
  MensajeWhatsappSalidaDto,
} from "../dtos/whatsapp.dto";

/**
 * Servicio de aplicación de WhatsApp: recordatorios de turno y —cuando el
 * profesional conectó la API oficial— el hilo de mensajes dentro de la app.
 *
 * Todo pasa por el puerto IProveedorWhatsapp, así que los mismos métodos
 * sirven con el enlace wa.me y con la Cloud API.
 */
export class ServicioWhatsapp {
  constructor(
    private readonly vistaPreviaUC: ObtenerVistaPreviaRecordatorio,
    private readonly prepararUC: PrepararRecordatorioWhatsapp,
    private readonly confirmarUC: ConfirmarRecordatorioWhatsapp,
    private readonly hiloUC: ObtenerHiloWhatsapp,
    private readonly enviarUC: EnviarMensajeWhatsapp,
    private readonly procesarEntranteUC: ProcesarMensajeEntranteWhatsapp,
    private readonly registrarEstadoUC: RegistrarEstadoWhatsapp,
  ) {}

  async obtenerVistaPrevia(turnoId: string): Promise<VistaPreviaSalidaDto> {
    return this.vistaPreviaUC.ejecutar(turnoId);
  }

  async prepararRecordatorio(
    datos: PrepararRecordatorioDto,
    usuarioId: string,
  ): Promise<RecordatorioPreparadoSalidaDto> {
    return this.prepararUC.ejecutar({
      turnoId: datos.turnoId,
      usuarioId,
      mensaje: datos.mensaje,
    });
  }

  async confirmarRecordatorio(datos: ConfirmarRecordatorioDto): Promise<RecordatorioSalidaDto> {
    const recordatorio = await this.confirmarUC.ejecutar(datos.recordatorioId, datos.enviado);
    return ServicioWhatsapp.aSalida(recordatorio);
  }

  async obtenerHilo(pacienteId: string): Promise<HiloWhatsappSalidaDto> {
    const hilo = await this.hiloUC.ejecutar(pacienteId);
    return { ...hilo, mensajes: hilo.mensajes.map(ServicioWhatsapp.aSalidaMensaje) };
  }

  async enviarMensaje(pacienteId: string, cuerpo: string): Promise<MensajeWhatsappSalidaDto> {
    return ServicioWhatsapp.aSalidaMensaje(await this.enviarUC.ejecutar(pacienteId, cuerpo));
  }

  /**
   * Ingesta de un webhook, ya acotada al inquilino por la ruta. Devuelve
   * cuántos mensajes se guardaron: los de números que no son de pacientes se
   * descartan y no se persisten en ningún lado.
   */
  async procesarEntrantes(mensajes: MensajeEntranteWhatsapp[]): Promise<number> {
    let guardados = 0;
    for (const mensaje of mensajes) {
      const resultado = await this.procesarEntranteUC.ejecutar(mensaje);
      if (resultado.estado === "GUARDADO") guardados += 1;
    }
    return guardados;
  }

  async registrarEstados(estados: EstadoEntregaWhatsapp[]): Promise<number> {
    return this.registrarEstadoUC.ejecutar(estados);
  }

  /** Estado resumido del recordatorio, tal como viaja en el DTO de turno. */
  static aSalida(recordatorio: RecordatorioWhatsapp): RecordatorioSalidaDto {
    const d = recordatorio.aPrimitivos();
    return {
      id: d.id,
      estado: d.estado,
      creadoEn: d.creadoEn,
      confirmadoEn: d.confirmadoEn,
    };
  }

  private static aSalidaMensaje(mensaje: MensajeWhatsapp): MensajeWhatsappSalidaDto {
    const d = mensaje.aPrimitivos();
    return {
      id: d.id,
      pacienteId: d.pacienteId,
      direccion: d.direccion,
      cuerpo: d.cuerpo,
      estado: d.estado,
      error: d.error,
      creadoEn: d.creadoEn,
    };
  }
}

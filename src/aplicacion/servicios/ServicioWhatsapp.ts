import type { ObtenerHiloWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ObtenerHiloWhatsapp";
import type { EnviarMensajeWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/EnviarMensajeWhatsapp";
import type {
  ProcesarMensajeEntranteWhatsapp,
  MensajeEntranteWhatsapp,
} from "@/aplicacion/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import type {
  RegistrarEstadoWhatsapp,
  EstadoEntregaWhatsapp,
} from "@/aplicacion/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import type { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import type {
  HiloWhatsappSalidaDto,
  MensajeWhatsappSalidaDto,
} from "../dtos/whatsapp.dto";

/**
 * Servicio de aplicación de WhatsApp: el CANAL.
 *
 * Es el hilo de mensajes con el paciente y la ingesta del webhook. Los
 * recordatorios de turno —a quién avisarle, con qué texto y cuándo— son otra
 * cosa y viven en `ServicioRecordatorios`: acá quedó lo que es propio de
 * hablar por WhatsApp, no de la tarea de avisar.
 */
export class ServicioWhatsapp {
  constructor(
    private readonly hiloUC: ObtenerHiloWhatsapp,
    private readonly enviarUC: EnviarMensajeWhatsapp,
    private readonly procesarEntranteUC: ProcesarMensajeEntranteWhatsapp,
    private readonly registrarEstadoUC: RegistrarEstadoWhatsapp,
  ) {}

  async obtenerHilo(pacienteId: string): Promise<HiloWhatsappSalidaDto> {
    const hilo = await this.hiloUC.ejecutar(pacienteId);
    return {
      ...hilo,
      mensajes: hilo.mensajes.map(ServicioWhatsapp.aSalidaMensaje),
    };
  }

  async enviarMensaje(
    pacienteId: string,
    cuerpo: string,
  ): Promise<MensajeWhatsappSalidaDto> {
    return ServicioWhatsapp.aSalidaMensaje(
      await this.enviarUC.ejecutar(pacienteId, cuerpo),
    );
  }

  /**
   * Ingesta de un webhook, ya acotada al inquilino por la ruta. Devuelve
   * cuántos mensajes se guardaron: los de números que no son de pacientes se
   * descartan y no se persisten en ningún lado.
   */
  async procesarEntrantes(
    mensajes: MensajeEntranteWhatsapp[],
  ): Promise<number> {
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

  private static aSalidaMensaje(
    mensaje: MensajeWhatsapp,
  ): MensajeWhatsappSalidaDto {
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

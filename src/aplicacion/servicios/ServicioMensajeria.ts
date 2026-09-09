import type { EnviarMensaje } from "@/aplicacion/casos-de-uso/mensajeria/EnviarMensaje";
import type { ObtenerConversacionDePaciente } from "@/aplicacion/casos-de-uso/mensajeria/ObtenerConversacionDePaciente";
import type { ListarMensajes } from "@/aplicacion/casos-de-uso/mensajeria/ListarMensajes";
import type { ListarConversaciones } from "@/aplicacion/casos-de-uso/mensajeria/ListarConversaciones";
import type { MarcarLeidos } from "@/aplicacion/casos-de-uso/mensajeria/MarcarLeidos";
import type { ContarNoLeidos } from "@/aplicacion/casos-de-uso/mensajeria/ContarNoLeidos";
import type { Mensaje } from "@/dominio/entidades/Mensaje";
import type {
  MensajeSalidaDto,
  HiloSalidaDto,
  ResumenConversacionDto,
} from "../dtos/mensajeria.dto";

/** Quién envía un mensaje (lo arma el router con la sesión). */
export interface RemitenteMensaje {
  autorId: string;
  autorEsNutricionista: boolean;
  pacienteId: string;
  cuerpo: string;
}

/** Servicio de aplicación de Mensajería (canal nutricionista ↔ paciente). */
export class ServicioMensajeria {
  constructor(
    private readonly enviarUC: EnviarMensaje,
    private readonly obtenerConversacionUC: ObtenerConversacionDePaciente,
    private readonly listarMensajesUC: ListarMensajes,
    private readonly listarConversacionesUC: ListarConversaciones,
    private readonly marcarLeidosUC: MarcarLeidos,
    private readonly contarNoLeidosUC: ContarNoLeidos,
  ) {}

  async enviar(datos: RemitenteMensaje): Promise<MensajeSalidaDto> {
    return ServicioMensajeria.aMensajeSalida(
      await this.enviarUC.ejecutar(datos),
    );
  }

  /** Abre (o crea) la conversación del paciente y trae sus mensajes. */
  async abrirHilo(pacienteId: string): Promise<HiloSalidaDto> {
    const conversacion = await this.obtenerConversacionUC.ejecutar(pacienteId);
    const mensajes = await this.listarMensajesUC.ejecutar(conversacion.id);
    return {
      conversacion: {
        id: conversacion.id,
        pacienteId: conversacion.pacienteId,
      },
      mensajes: mensajes.map(ServicioMensajeria.aMensajeSalida),
    };
  }

  async listarConversaciones(
    viewerId: string,
  ): Promise<ResumenConversacionDto[]> {
    return this.listarConversacionesUC.ejecutar(viewerId);
  }

  async marcarLeidos(pacienteId: string, viewerId: string): Promise<void> {
    await this.marcarLeidosUC.ejecutar(pacienteId, viewerId);
  }

  async contarNoLeidos(viewerId: string, pacienteId?: string): Promise<number> {
    return this.contarNoLeidosUC.ejecutar(viewerId, pacienteId);
  }

  private static aMensajeSalida(mensaje: Mensaje): MensajeSalidaDto {
    const p = mensaje.aPrimitivos();
    return {
      id: p.id,
      conversacionId: p.conversacionId,
      autorId: p.autorId,
      cuerpo: p.cuerpo,
      leidoEn: p.leidoEn,
      creadoEn: p.creadoEn,
    };
  }
}

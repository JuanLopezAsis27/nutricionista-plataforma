import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";

const VENTANA_MS = 24 * 60 * 60 * 1000;

/** Hilo de WhatsApp de un paciente, con el contexto que la UI necesita. */
export interface HiloWhatsapp {
  conectado: boolean;
  mensajes: MensajeWhatsapp[];
  /**
   * Meta solo deja escribir texto libre dentro de las 24 h posteriores al
   * último mensaje del paciente; fuera de esa ventana hace falta una plantilla
   * aprobada. La UI avisa antes de que el envío falle.
   */
  ventanaAbierta: boolean;
  ventanaVenceEn: Date | null;
}

/** Caso de uso: leer el hilo de WhatsApp de un paciente. */
export class ObtenerHiloWhatsapp {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(
    pacienteId: string,
    ahora: Date = new Date(),
  ): Promise<HiloWhatsapp> {
    const conectado = (await this.proveedor.modoActual()) === "API";
    if (!conectado) {
      return {
        conectado: false,
        mensajes: [],
        ventanaAbierta: false,
        ventanaVenceEn: null,
      };
    }

    const mensajes = await this.mensajes.listarPorPaciente(pacienteId);
    const ultimoEntrante = await this.mensajes.ultimoEntrante(pacienteId);
    const vence = ultimoEntrante
      ? new Date(ultimoEntrante.creadoEn.getTime() + VENTANA_MS)
      : null;

    return {
      conectado: true,
      mensajes,
      ventanaAbierta: vence != null && vence.getTime() > ahora.getTime(),
      ventanaVenceEn: vence,
    };
  }
}

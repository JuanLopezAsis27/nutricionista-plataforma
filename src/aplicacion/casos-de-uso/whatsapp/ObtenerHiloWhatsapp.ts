import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { numeroDeFicha } from "./numeroCompartido";

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
  /**
   * Las OTRAS fichas que comparten el número (migración 81). Vacío casi
   * siempre. Con alguna, el hilo trae también sus mensajes: la conversación es
   * con quien tiene el teléfono, y cada mensaje dice de qué ficha quedó.
   */
  compartidoCon: { pacienteId: string; nombre: string }[];
}

/**
 * Caso de uso: leer el hilo de WhatsApp de un paciente.
 *
 * Si el número lo comparten varias fichas (hermanos con el teléfono de la
 * madre), el hilo es el del NÚMERO: se ven todos sus mensajes, estén en la
 * ficha que estén, y la ventana de 24 h también es del número —así la cuenta
 * Meta—. Ver `numeroCompartido.ts`.
 */
export class ObtenerHiloWhatsapp {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
    private readonly pacientes: IPacienteRepositorio,
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
        compartidoCon: [],
      };
    }

    // Con una sola ficha en el número no hace falta ampliar la búsqueda.
    const { telefono, otras } = await numeroDeFicha(this.pacientes, pacienteId);
    const delNumero = otras.length > 0 ? telefono : null;
    const mensajes = await this.mensajes.listarPorPaciente(
      pacienteId,
      undefined,
      delNumero,
    );
    const ultimoEntrante = await this.mensajes.ultimoEntrante(
      pacienteId,
      delNumero,
    );
    const vence = ultimoEntrante
      ? new Date(ultimoEntrante.creadoEn.getTime() + VENTANA_MS)
      : null;

    return {
      conectado: true,
      mensajes,
      ventanaAbierta: vence != null && vence.getTime() > ahora.getTime(),
      ventanaVenceEn: vence,
      compartidoCon: otras.map((p) => ({
        pacienteId: p.id,
        nombre: p.nombreCompleto,
      })),
    };
  }
}

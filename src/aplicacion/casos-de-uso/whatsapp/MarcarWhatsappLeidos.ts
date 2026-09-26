import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { MarcarAvisosDeConversacionVistos } from "../notificaciones/MarcarAvisosDeConversacionVistos";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { numeroDeFicha } from "./numeroCompartido";

/**
 * Caso de uso: el profesional abrió el chat de WhatsApp de un paciente. Los
 * entrantes pasan a leídos —dejan de contar en el sidebar y en la bandeja— y
 * el aviso «escribió por WhatsApp» de la campana se da por visto.
 *
 * Es la contracara de `MarcarLeidos` del chat del portal: hasta la migración
 * 77 WhatsApp no tenía estado de leído, y un mensaje entrante no se veía en
 * ningún contador.
 *
 * Con el número compartido entre fichas (migración 81), el hilo muestra la
 * conversación de todo el número, así que abrirlo desde cualquiera de ellas
 * da por leído todo lo del número, y los avisos de todas esas fichas.
 */
export class MarcarWhatsappLeidos {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly avisos: MarcarAvisosDeConversacionVistos,
    private readonly reloj: IRelojFecha,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<void> {
    const { telefono, otras } = await numeroDeFicha(this.pacientes, pacienteId);
    await this.mensajes.marcarLeidos(
      pacienteId,
      this.reloj.ahora(),
      otras.length > 0 ? telefono : null,
    );
    for (const id of [pacienteId, ...otras.map((p) => p.id)]) {
      await this.avisos.ejecutar(id, "WHATSAPP");
    }
  }
}

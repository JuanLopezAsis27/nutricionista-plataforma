import type {
  IMensajeriaRepositorio,
  ResumenConversacion,
} from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { CanalConversacion } from "../notificaciones/MarcarAvisosDeConversacionVistos";

/**
 * Una fila de la bandeja: la conversación con UN paciente, por los dos
 * canales juntos.
 */
export interface ConversacionBandeja extends ResumenConversacion {
  /** Sin leer del chat del portal. */
  noLeidosPortal: number;
  /** Entrantes de WhatsApp sin leer. */
  noLeidosWhatsapp: number;
  /** Por dónde llegó el último mensaje: decide qué canal abre la fila. */
  ultimoCanal: CanalConversacion | null;
}

/**
 * Caso de uso: la bandeja del nutricionista, con el portal y WhatsApp en la
 * misma lista.
 *
 * Hasta acá listaba solo las conversaciones del portal: un paciente que
 * escribía únicamente por WhatsApp no aparecía en la bandeja, y lo que
 * escribía no sumaba a ningún número. Desde la cabeza del profesional es una
 * sola conversación por paciente («¿qué hablé con él?»), así que es una sola
 * fila: `noLeidos` suma los dos canales, y el último mensaje es el más nuevo
 * de cualquiera de los dos.
 */
export class ListarConversaciones {
  constructor(
    private readonly repositorio: IMensajeriaRepositorio,
    private readonly whatsapp: IMensajeWhatsappRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(viewerId: string): Promise<ConversacionBandeja[]> {
    const [portal, chatsWhatsapp] = await Promise.all([
      this.repositorio.listarResumen(viewerId),
      this.whatsapp.resumenPorPaciente(),
    ]);

    const porPaciente = new Map<string, ConversacionBandeja>();
    for (const c of portal) {
      porPaciente.set(c.pacienteId, {
        ...c,
        noLeidosPortal: c.noLeidos,
        noLeidosWhatsapp: 0,
        ultimoCanal: c.ultimoMensajeEn ? "PORTAL" : null,
      });
    }

    // Los que solo hablaron por WhatsApp no tienen fila del portal: su nombre
    // se busca en una sola consulta, archivados incluidos (una conversación
    // vieja sigue siendo de esa persona).
    const soloWhatsapp = chatsWhatsapp
      .map((w) => w.pacienteId)
      .filter((id) => !porPaciente.has(id));
    const nombres = new Map(
      (await this.pacientes.obtenerPorIds(soloWhatsapp)).map((p) => [
        p.id,
        p.nombreCompleto,
      ]),
    );

    for (const w of chatsWhatsapp) {
      const fila = porPaciente.get(w.pacienteId);
      if (!fila) {
        porPaciente.set(w.pacienteId, {
          id: `whatsapp:${w.pacienteId}`,
          pacienteId: w.pacienteId,
          pacienteNombre: nombres.get(w.pacienteId) ?? "Paciente",
          // La foto vive en la cuenta del portal, que el resumen de WhatsApp
          // no trae: estos van con iniciales.
          pacienteFotoArchivoId: null,
          ultimoMensajeTexto: w.ultimoMensajeTexto,
          ultimoMensajeEn: w.ultimoMensajeEn,
          noLeidos: w.noLeidos,
          noLeidosPortal: 0,
          noLeidosWhatsapp: w.noLeidos,
          ultimoCanal: "WHATSAPP",
        });
        continue;
      }
      fila.noLeidosWhatsapp = w.noLeidos;
      fila.noLeidos = fila.noLeidosPortal + w.noLeidos;
      if (
        !fila.ultimoMensajeEn ||
        w.ultimoMensajeEn.getTime() > fila.ultimoMensajeEn.getTime()
      ) {
        fila.ultimoMensajeTexto = w.ultimoMensajeTexto;
        fila.ultimoMensajeEn = w.ultimoMensajeEn;
        fila.ultimoCanal = "WHATSAPP";
      }
    }

    // Lo más reciente arriba, por cualquiera de los dos canales.
    return [...porPaciente.values()].sort(
      (a, b) =>
        (b.ultimoMensajeEn?.getTime() ?? 0) -
        (a.ultimoMensajeEn?.getTime() ?? 0),
    );
  }
}

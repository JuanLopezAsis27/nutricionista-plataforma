import type {
  IMensajeriaRepositorio,
  ResumenConversacion,
} from "@/dominio/repositorios/IMensajeriaRepositorio";
import type {
  IMensajeWhatsappRepositorio,
  ResumenWhatsappPaciente,
} from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import type { CanalConversacion } from "../notificaciones/MarcarAvisosDeConversacionVistos";

/** Una ficha que participa de un chat de número compartido. */
export interface IntegranteConversacion {
  pacienteId: string;
  nombre: string;
}

/**
 * Una fila de la bandeja.
 *
 * - `PACIENTE`: la conversación con UN paciente, por los dos canales juntos.
 * - `NUMERO_COMPARTIDO` (migración 81): el WhatsApp de un número que tienen
 *   varias fichas del consultorio —dos hermanos con el de la madre—. Es UN
 *   solo chat, con quien tiene el teléfono, y `integrantes` dice de quiénes es.
 *   `pacienteId` es el primero de ellos: es por el que se abre el hilo, que ya
 *   trae todo el número (`ObtenerHiloWhatsapp`).
 */
export interface ConversacionBandeja extends ResumenConversacion {
  tipo: "PACIENTE" | "NUMERO_COMPARTIDO";
  /** Vacío en las filas de un paciente. */
  integrantes: IntegranteConversacion[];
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
 * Desde la cabeza del profesional es una sola conversación por paciente
 * («¿qué hablé con él?»), así que es una sola fila: `noLeidos` suma los dos
 * canales, y el último mensaje es el más nuevo de cualquiera de los dos.
 *
 * **Salvo el WhatsApp de un número compartido.** Si varias fichas del
 * consultorio tienen el mismo teléfono, por WhatsApp se habla con UNA persona
 * —la madre de los dos hermanos—, y repartir esa charla en una fila por ficha
 * la partía en pedazos. Ese WhatsApp es una fila propia (`NUMERO_COMPARTIDO`)
 * con los nombres de todos; el chat del portal de cada ficha sigue en la fila
 * de esa ficha, porque ese sí es de cada persona. El mismo número en otro
 * consultorio es otra conversación: todo esto corre dentro del inquilino.
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
        tipo: "PACIENTE",
        integrantes: [],
        noLeidosPortal: c.noLeidos,
        noLeidosWhatsapp: 0,
        ultimoCanal: c.ultimoMensajeEn ? "PORTAL" : null,
      });
    }

    // Las fichas con WhatsApp: su nombre (las que no tienen fila del portal,
    // archivadas incluidas) y su número. Y todas las fichas de esos números,
    // tengan mensajes o no, para saber cuáles se comparten. Dos consultas.
    const conWhatsapp = await this.pacientes.obtenerPorIds(
      chatsWhatsapp.map((w) => w.pacienteId),
    );
    const fichaPorId = new Map(conWhatsapp.map((p) => [p.id, p]));
    const telefonos = [
      ...new Set(
        conWhatsapp
          .map((p) => p.telefonoE164)
          .filter((t): t is string => t !== null),
      ),
    ];
    const fichasPorNumero = agruparPorNumero(
      await this.pacientes.listarPorTelefonosE164(telefonos),
    );

    const compartidos = new Map<string, ConversacionBandeja>();
    for (const w of chatsWhatsapp) {
      const ficha = fichaPorId.get(w.pacienteId);
      const numero = ficha?.telefonoE164 ?? null;
      const fichas = numero ? (fichasPorNumero.get(numero) ?? []) : [];

      if (numero && fichas.length > 1) {
        const fila =
          compartidos.get(numero) ?? filaDeNumeroCompartido(numero, fichas);
        compartidos.set(numero, fila);
        sumarWhatsapp(fila, w);
        continue;
      }

      const fila = porPaciente.get(w.pacienteId);
      if (fila) {
        sumarWhatsapp(fila, w);
        continue;
      }
      porPaciente.set(w.pacienteId, {
        id: `whatsapp:${w.pacienteId}`,
        pacienteId: w.pacienteId,
        pacienteNombre: ficha?.nombreCompleto ?? "Paciente",
        // La foto vive en la cuenta del portal, que el resumen de WhatsApp
        // no trae: estos van con iniciales.
        pacienteFotoArchivoId: null,
        ultimoMensajeTexto: w.ultimoMensajeTexto,
        ultimoMensajeEn: w.ultimoMensajeEn,
        noLeidos: w.noLeidos,
        tipo: "PACIENTE",
        integrantes: [],
        noLeidosPortal: 0,
        noLeidosWhatsapp: w.noLeidos,
        ultimoCanal: "WHATSAPP",
      });
    }

    // Lo más reciente arriba, por cualquiera de los dos canales.
    return [...porPaciente.values(), ...compartidos.values()].sort(
      (a, b) =>
        (b.ultimoMensajeEn?.getTime() ?? 0) -
        (a.ultimoMensajeEn?.getTime() ?? 0),
    );
  }
}

/** Fichas por número, conservando el orden (la más antigua primero). */
function agruparPorNumero(fichas: Paciente[]): Map<string, Paciente[]> {
  const mapa = new Map<string, Paciente[]>();
  for (const ficha of fichas) {
    if (!ficha.telefonoE164) continue;
    const lista = mapa.get(ficha.telefonoE164) ?? [];
    lista.push(ficha);
    mapa.set(ficha.telefonoE164, lista);
  }
  return mapa;
}

function filaDeNumeroCompartido(
  numero: string,
  fichas: Paciente[],
): ConversacionBandeja {
  const integrantes = fichas.map((p) => ({
    pacienteId: p.id,
    nombre: p.nombreCompleto,
  }));
  return {
    id: `whatsapp-numero:${numero}`,
    pacienteId: integrantes[0]!.pacienteId,
    pacienteNombre: integrantes.map((i) => i.nombre).join(" · "),
    pacienteFotoArchivoId: null,
    ultimoMensajeTexto: null,
    ultimoMensajeEn: null,
    noLeidos: 0,
    tipo: "NUMERO_COMPARTIDO",
    integrantes,
    noLeidosPortal: 0,
    noLeidosWhatsapp: 0,
    ultimoCanal: "WHATSAPP",
  };
}

/** Suma el WhatsApp de una ficha a una fila: no leídos y último mensaje. */
function sumarWhatsapp(
  fila: ConversacionBandeja,
  w: ResumenWhatsappPaciente,
): void {
  fila.noLeidosWhatsapp += w.noLeidos;
  fila.noLeidos = fila.noLeidosPortal + fila.noLeidosWhatsapp;
  if (
    !fila.ultimoMensajeEn ||
    w.ultimoMensajeEn.getTime() > fila.ultimoMensajeEn.getTime()
  ) {
    fila.ultimoMensajeTexto = w.ultimoMensajeTexto;
    fila.ultimoMensajeEn = w.ultimoMensajeEn;
    fila.ultimoCanal = "WHATSAPP";
  }
}

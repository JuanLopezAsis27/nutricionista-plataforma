import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import type { RegistrarRespuestaDeRecordatorio } from "../recordatorios/RegistrarRespuestaDeRecordatorio";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import type { AtenderBotonWhatsapp } from "./AtenderBotonWhatsapp";
import { leerPayloadDeBoton } from "@/dominio/servicios/botonesWhatsapp";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";

/** Mensaje entrante tal como lo entrega el webhook de Meta, ya desarmado. */
export interface MensajeEntranteWhatsapp {
  /** Teléfono del remitente en E.164 sin "+". */
  telefono: string;
  cuerpo: string;
  /** wamid del mensaje. */
  idExterno: string;
  /** Momento en que Meta lo recibió. */
  enviadoEn: Date;
  /**
   * Si el mensaje es el toque de un botón de plantilla, el payload que puso
   * la app al enviarla (acción + turno). El `cuerpo` es el texto del botón.
   */
  payloadBoton?: string | null;
}

/** Largo del adelanto del mensaje que se muestra en la campana. */
const LARGO_RESUMEN = 120;

/** El mensaje recortado para el feed, sin cortar a mitad de una palabra fea. */
function resumir(cuerpo: string): string {
  const limpio = cuerpo.replace(/\s+/g, " ").trim();
  if (!limpio) return "(mensaje sin texto)";
  return limpio.length <= LARGO_RESUMEN
    ? limpio
    : `${limpio.slice(0, LARGO_RESUMEN).trimEnd()}…`;
}

/** Qué se hizo con el mensaje: sirve para el log del webhook. */
export type ResultadoIngesta =
  | { estado: "GUARDADO"; pacienteId: string; recordatoriosMarcados: number }
  | { estado: "DESCARTADO"; motivo: "SIN_PACIENTE" | "DUPLICADO" };

/**
 * Caso de uso: dar entrada a un mensaje que llegó por WhatsApp.
 *
 * El filtro es lo primero que corre y es deliberadamente por descarte en la
 * ingesta, no por filtrado en la vista: si el número no es de un paciente del
 * inquilino, el mensaje NO se persiste en ningún lado. Un filtro de vista
 * dejaría los chats personales del profesional guardados en la base, que es
 * exactamente lo que hay que evitar.
 *
 * También es idempotente: Meta reintenta los webhooks que no respondió 200, y
 * el wamid ya visto se ignora.
 */
export class ProcesarMensajeEntranteWhatsapp {
  constructor(
    private readonly mensajes: IMensajeWhatsappRepositorio,
    private readonly resolverPaciente: ResolverPacientePorTelefono,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
    private readonly registrarRespuesta: RegistrarRespuestaDeRecordatorio,
    private readonly emitirNotificacion: EmitirNotificacion,
    private readonly atenderBoton: AtenderBotonWhatsapp,
  ) {}

  async ejecutar(entrante: MensajeEntranteWhatsapp): Promise<ResultadoIngesta> {
    const paciente = await this.resolverPaciente.ejecutar(entrante.telefono);
    if (!paciente) {
      return { estado: "DESCARTADO", motivo: "SIN_PACIENTE" };
    }

    if (await this.mensajes.obtenerPorIdExterno(entrante.idExterno)) {
      return { estado: "DESCARTADO", motivo: "DUPLICADO" };
    }

    await this.mensajes.crear(
      MensajeWhatsapp.crear(
        {
          pacienteId: paciente.id,
          direccion: "ENTRANTE",
          telefono: entrante.telefono,
          cuerpo: entrante.cuerpo,
          idExterno: entrante.idExterno,
          estado: "ENTREGADO",
        },
        crypto.randomUUID(),
        entrante.enviadoEn,
      ),
    );

    // Que el paciente conteste es lo que cierra el círculo del recordatorio:
    // el log deja de decir solo "salió" y pasa a decir "contestó" —y, cuando
    // la respuesta es un sí inequívoco, "viene". Es la mitad de la pregunta
    // que se hace el profesional al mirar la agenda de mañana.
    //
    // Con un botón no hay nada que interpretar: la acción la dice el payload,
    // no el texto («Confirmar» no está entre las afirmaciones, y no tiene por
    // qué estar: el profesional le pone al botón el texto que quiera).
    const boton = leerPayloadDeBoton(entrante.payloadBoton);
    const respuesta = await this.registrarRespuesta.ejecutar(
      paciente.id,
      entrante.cuerpo,
      entrante.enviadoEn,
      boton ? { confirmo: boton.accion === "CONFIRMAR_TURNO" } : undefined,
    );

    // Un botón que actuó ya dejó su propio aviso (turno confirmado, pidió
    // reprogramar): sumarle "escribió por WhatsApp" diría lo mismo dos veces.
    const atendido = boton
      ? await this.atenderBoton.ejecutar(paciente, boton)
      : false;

    // El aviso que queda: el bus de abajo solo llega a quien tiene la app
    // abierta en ese instante, y un WhatsApp que entró a las 22:00 tiene que
    // seguir estando a la mañana siguiente. Por eso además se persiste, con su
    // estado de visto, igual que un mensaje del chat de la app.
    if (!atendido) {
      await this.emitirNotificacion.ejecutar({
        tipo: "WHATSAPP_ENTRANTE",
        titulo: `${paciente.nombreCompleto} escribió por WhatsApp`,
        detalle: resumir(entrante.cuerpo),
        pacienteId: paciente.id,
        enlace: `/dashboard/mensajes?paciente=${paciente.id}&canal=whatsapp`,
        // Se agrupa mientras no se vea, igual que el chat de la app. Por
        // WhatsApp la gente escribe en ráfaga —una idea por mensaje—, así que
        // sin esto diez mensajes de un minuto dejaban diez líneas idénticas en
        // la campana y tapaban todo lo demás.
        agruparMientrasNoSeVea: true,
      });
    }

    // El webhook corre fuera de cualquier request de la UI: el bus (pg_notify)
    // es lo que cruza procesos para que el hilo abierto se entere sin polling.
    for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
      await this.bus.publicar({
        tipo: "whatsapp.mensaje",
        usuarioId: nutri.id,
        datos: { pacienteId: paciente.id },
      });
    }

    return {
      estado: "GUARDADO",
      pacienteId: paciente.id,
      recordatoriosMarcados: respuesta.marcados,
    };
  }
}

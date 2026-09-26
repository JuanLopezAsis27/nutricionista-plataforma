import type { IMensajeriaRepositorio } from "@/dominio/repositorios/IMensajeriaRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import { Conversacion } from "@/dominio/entidades/Conversacion";
import { Mensaje } from "@/dominio/entidades/Mensaje";

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

/** Datos para enviar un mensaje. */
export interface DatosEnviarMensaje {
  autorId: string;
  autorEsNutricionista: boolean;
  pacienteId: string;
  cuerpo: string;
}

/**
 * Caso de uso: enviar un mensaje en la conversación de un paciente.
 *
 * Resuelve (o crea) la conversación, persiste el mensaje, actualiza el
 * resumen y **publica un evento de tiempo real** al destinatario para que su
 * UI se actualice al instante. La autorización (qué paciente) la resuelve el
 * router con el pacienteId de la sesión.
 */
export class EnviarMensaje {
  constructor(
    private readonly repositorio: IMensajeriaRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
    private readonly pacientes: IPacienteRepositorio,
    private readonly emitirNotificacion: EmitirNotificacion,
  ) {}

  async ejecutar(datos: DatosEnviarMensaje): Promise<Mensaje> {
    let conversacion = await this.repositorio.obtenerConversacionPorPaciente(
      datos.pacienteId,
    );
    if (!conversacion) {
      conversacion = await this.repositorio.crearConversacion(
        Conversacion.crear(datos.pacienteId, crypto.randomUUID()),
      );
    }

    const mensaje = await this.repositorio.crearMensaje(
      Mensaje.crear(
        {
          conversacionId: conversacion.id,
          autorId: datos.autorId,
          cuerpo: datos.cuerpo,
        },
        crypto.randomUUID(),
      ),
    );

    const props = mensaje.aPrimitivos();
    conversacion.registrarUltimoMensaje(props.cuerpo, props.creadoEn);
    await this.repositorio.actualizarConversacion(conversacion);

    // Notificar al otro extremo en tiempo real. Va la ficha: el canal es la
    // CUENTA, y la de un paciente puede estar en varios consultorios; con la
    // ficha, su portal sabe si el mensaje es del consultorio que está mirando.
    for (const usuarioId of await this.destinatarios(datos)) {
      await this.bus.publicar({
        tipo: "mensaje.nuevo",
        usuarioId,
        datos: {
          conversacionId: conversacion.id,
          pacienteId: datos.pacienteId,
        },
      });
    }

    // Y dejarle el aviso al profesional, que es el que tiene campana. Solo
    // cuando escribe el PACIENTE: avisarle al nutricionista de su propio
    // mensaje no le dice nada que no sepa.
    if (!datos.autorEsNutricionista) {
      await this.avisarAlProfesional(datos, props.cuerpo);
    }

    return mensaje;
  }

  /**
   * El aviso que QUEDA.
   *
   * El evento del bus de arriba es efímero: solo llega a quien tenga la app
   * abierta en ese momento. Antes, lo que sostenía este aviso en la campana era
   * el contador de mensajes sin leer, así que abrir la conversación lo hacía
   * desaparecer —y no quedaba manera de volver a verlo—. Persistirlo lo pone a
   * la par de los otros dos avisos del paciente (WhatsApp y turno confirmado):
   * se ve, queda marcado como visto y se puede volver a mirar.
   *
   * Se AGRUPA mientras no se vea: cinco mensajes seguidos dejan una sola línea,
   * que es lo que mostraba el contador de no leídos.
   */
  private async avisarAlProfesional(
    datos: DatosEnviarMensaje,
    cuerpo: string,
  ): Promise<void> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    const nombre = paciente?.nombreCompleto ?? "Un paciente";

    await this.emitirNotificacion.ejecutar({
      tipo: "MENSAJE_APP",
      titulo: `${nombre} te escribió`,
      detalle: resumir(cuerpo),
      pacienteId: datos.pacienteId,
      enlace: `/dashboard/mensajes?paciente=${datos.pacienteId}`,
      agruparMientrasNoSeVea: true,
    });
  }

  private async destinatarios(datos: DatosEnviarMensaje): Promise<string[]> {
    if (datos.autorEsNutricionista) {
      const usuario = await this.usuarios.obtenerPorPacienteId(
        datos.pacienteId,
      );
      return usuario ? [usuario.id] : [];
    }
    const nutris = await this.usuarios.listarPorRol("NUTRICIONISTA");
    return nutris.map((n) => n.id).filter((id) => id !== datos.autorId);
  }
}

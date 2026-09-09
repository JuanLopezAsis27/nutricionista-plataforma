import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import type { RegistrarRespuestaDeRecordatorio } from "../recordatorios/RegistrarRespuestaDeRecordatorio";
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
    const respuesta = await this.registrarRespuesta.ejecutar(
      paciente.id,
      entrante.cuerpo,
      entrante.enviadoEn,
    );

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

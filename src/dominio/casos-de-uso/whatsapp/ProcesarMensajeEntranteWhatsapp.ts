import type { IMensajeWhatsappRepositorio } from "../../repositorios/IMensajeWhatsappRepositorio";
import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "../../servicios/IBusEventos";
import type { ResolverPacientePorTelefono } from "./ResolverPacientePorTelefono";
import { MensajeWhatsapp } from "../../entidades/MensajeWhatsapp";

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
  | { estado: "GUARDADO"; pacienteId: string }
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

    // El webhook corre fuera de cualquier request de la UI: el bus (pg_notify)
    // es lo que cruza procesos para que el hilo abierto se entere sin polling.
    for (const nutri of await this.usuarios.listarPorRol("NUTRICIONISTA")) {
      await this.bus.publicar({
        tipo: "whatsapp.mensaje",
        usuarioId: nutri.id,
        datos: { pacienteId: paciente.id },
      });
    }

    return { estado: "GUARDADO", pacienteId: paciente.id };
  }
}

import type { IMensajeriaRepositorio } from "../../repositorios/IMensajeriaRepositorio";
import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "../../servicios/IBusEventos";
import { Conversacion } from "../../entidades/Conversacion";
import { Mensaje } from "../../entidades/Mensaje";

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

    // Notificar al otro extremo en tiempo real.
    for (const usuarioId of await this.destinatarios(datos)) {
      await this.bus.publicar({
        tipo: "mensaje.nuevo",
        usuarioId,
        datos: { conversacionId: conversacion.id },
      });
    }

    return mensaje;
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

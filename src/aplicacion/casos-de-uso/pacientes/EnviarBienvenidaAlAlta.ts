import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IVerificadorDominioEmail } from "@/dominio/servicios/IVerificadorDominioEmail";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import type { EmitirNotificacion } from "../notificaciones/EmitirNotificacion";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";

/** Largo máximo del motivo técnico que se copia en el aviso. */
const LARGO_MOTIVO = 160;

/**
 * Caso de uso: el envío AUTOMÁTICO de la bienvenida al dar de alta un
 * paciente. Antes de mandar nada, respeta el interruptor del consultorio
 * (`bienvenidaAutomaticaActiva`): apagado, no manda y no queda registrado
 * ningún envío. El envío manual desde el listado (`EnviarBienvenidaMasiva`)
 * no pasa por este interruptor a propósito: es la vía para mandarla igual.
 *
 * **Si no sale, avisa al profesional** (`BIENVENIDA_FALLIDA` en la campana).
 * El alta dice «creado» igual —la ficha no se puede perder por un email—, y
 * sin el aviso nadie se enteraba de que el paciente se quedó sin sus datos de
 * acceso hasta que llamaba para preguntar. Dos maneras de no salir:
 *
 * - **El dominio no recibe correo** (`ana@gmial.com`): se pregunta por DNS
 *   ANTES de mandar, y no se manda.
 * - **El servidor lo rechaza** al enviar (casilla inexistente en un servidor
 *   que lo dice en el momento, SMTP caído).
 *
 * Lo que NO se puede saber acá: una casilla inexistente en un dominio que
 * recibe (`anaaa@gmail.com`) casi siempre se acepta y rebota minutos después,
 * a una casilla que la app no lee.
 *
 * Nunca lanza: corre al final de un alta que ya salió bien.
 */
export class EnviarBienvenidaAlAlta {
  constructor(
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly enviarUno: EnviarEmailDeBienvenida,
    private readonly verificador: IVerificadorDominioEmail,
    private readonly emitirNotificacion: EmitirNotificacion,
  ) {}

  async ejecutar(datos: {
    paciente: Paciente;
    contrasena: string;
  }): Promise<void> {
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    if (!config.bienvenidaAutomaticaActiva) return;

    const { paciente } = datos;
    const email = paciente.email;
    // Sin email no hay a quién mandarle nada: no es una falla, es un alta sin
    // portal por email.
    if (!email) return;

    if ((await this.verificador.recibeCorreo(email)) === false) {
      const dominio = email.split("@")[1] ?? email;
      await this.avisar(
        paciente,
        `El dominio «${dominio}» no recibe correo: revisá que ${email} esté bien escrito.`,
      );
      return;
    }

    let enviado: boolean;
    try {
      enviado = await this.enviarUno.ejecutar({
        nombrePaciente: paciente.nombreCompleto,
        email,
        contrasena: datos.contrasena,
      });
    } catch (error) {
      console.error("[bienvenida] no se pudo enviar el email:", error);
      const motivo = error instanceof Error ? error.message : String(error);
      await this.avisar(
        paciente,
        `El servidor de correo rechazó ${email}: ${recortar(motivo)}`,
      );
      return;
    }
    if (enviado) {
      await this.pacientes.actualizar(
        paciente.marcarBienvenidaEnviada(new Date()),
      );
    }
  }

  private async avisar(paciente: Paciente, motivo: string): Promise<void> {
    await this.emitirNotificacion.ejecutar({
      tipo: "BIENVENIDA_FALLIDA",
      titulo: `No se pudo mandar la bienvenida a ${paciente.nombreCompleto}`,
      detalle: `${motivo} No le llegaron sus datos de acceso: corregí el email en su ficha y reenviala desde Pacientes.`,
      pacienteId: paciente.id,
      enlace: `/dashboard/pacientes/${paciente.id}`,
    });
  }
}

function recortar(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > LARGO_MOTIVO
    ? `${limpio.slice(0, LARGO_MOTIVO)}…`
    : limpio;
}

import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { normalizarNombreUsuario } from "@/dominio/servicios/nombreUsuario";

/** Con qué va a entrar la persona, tal como lo cargó el profesional. */
export interface DatosAccesoPortal {
  /**
   * Obligatorio si la ficha no tiene email, o si su email ya es el usuario de
   * otra cuenta de este consultorio (dos hermanos con el email de la madre).
   */
  nombreUsuario?: string | null;
  password: string;
}

/**
 * Cómo terminó:
 * - `CUENTA_NUEVA`: se creó la cuenta y quedó asociada a la ficha.
 * - `INVITACION`: el email de la ficha ya es la cuenta de un paciente de OTRO
 *   consultorio. No se asocia sola (ver la clase): hay que mandarle un código.
 */
export type ResultadoAccesoPortal =
  { tipo: "CUENTA_NUEVA"; cuenta: Usuario } | { tipo: "INVITACION" };

/**
 * Caso de uso: darle a una ficha su cuenta del portal.
 *
 * **Nunca asocia la ficha a una cuenta que ya existe** (migración 80). Hasta
 * acá, si el email del alta tenía cuenta, se la vinculaba sola: un email mal
 * escrito le abría la ficha a otra persona. Ahora eso solo pasa con un código
 * de invitación que canjea la persona entrando con SU contraseña. Si el email
 * de la ficha es la cuenta de un paciente de otro consultorio, este caso de
 * uso no crea nada y responde `INVITACION`.
 *
 * Con qué entra la cuenta nueva:
 * - con el email de la ficha, si está libre en la plataforma;
 * - con el nombre de usuario, si se cargó (puede ir junto con el email);
 * - si la ficha no tiene email, o si el suyo ya es el usuario de otra cuenta de
 *   ESTE consultorio —un hermano—, el nombre de usuario es obligatorio y la
 *   cuenta queda sin email de ingreso: el email de la ficha sigue siendo el
 *   de contacto.
 *
 * La contraseña la eligió el profesional: queda provisional.
 */
export class DarAccesoPortal {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly hasheador: IHasheadorContrasena,
  ) {}

  async ejecutar(
    pacienteId: string,
    datos: DatosAccesoPortal,
  ): Promise<ResultadoAccesoPortal> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) throw new ErrorPacienteNoEncontrado(pacienteId);
    if (await this.usuarios.obtenerPorPacienteId(pacienteId)) {
      throw new ErrorValidacion(
        `${paciente.nombreCompleto} ya tiene cuenta del portal.`,
      );
    }

    const nombreUsuario = datos.nombreUsuario?.trim()
      ? normalizarNombreUsuario(datos.nombreUsuario)
      : null;

    // ¿El email de la ficha puede ser el de ingreso?
    let emailDeIngreso: string | null = null;
    if (paciente.email) {
      const cuentaConEseEmail = await this.usuarios.obtenerPorEmailGlobal(
        paciente.email,
      );
      if (!cuentaConEseEmail) {
        emailDeIngreso = paciente.email;
      } else if (
        cuentaConEseEmail.esPaciente &&
        !(await this.tieneFichaAca(cuentaConEseEmail.id))
      ) {
        // Paciente de otro consultorio: probablemente la misma persona, pero
        // eso lo confirma ella canjeando el código, no este caso de uso.
        return { tipo: "INVITACION" };
      }
      // Si no: es la cuenta de un paciente de ESTE consultorio (un hermano con
      // el mismo email de contacto) o la de un profesional. No sirve como
      // ingreso, y la cuenta nueva necesita un usuario.
    }

    if (!emailDeIngreso && !nombreUsuario) {
      throw new ErrorValidacion(
        paciente.email
          ? `El email ${paciente.email} ya es el usuario de otra cuenta. Para darle acceso a ${paciente.nombreCompleto}, elegí un nombre de usuario.`
          : `${paciente.nombreCompleto} no tiene email: para darle acceso al portal, elegí un nombre de usuario.`,
      );
    }
    if (
      nombreUsuario &&
      (await this.usuarios.nombreUsuarioYaRegistrado(nombreUsuario))
    ) {
      throw new ErrorValidacion(
        `El nombre de usuario «${nombreUsuario}» ya está en uso. Elegí otro.`,
      );
    }

    const cuenta = await this.usuarios.crear(
      Usuario.crear(
        {
          email: emailDeIngreso,
          nombreUsuario,
          passwordHash: await this.hasheador.hashear(datos.password),
          rol: "PACIENTE",
          // La eligió el profesional, no la persona.
          passwordProvisional: true,
        },
        crypto.randomUUID(),
      ),
    );
    try {
      await this.cuentas.vincular(cuenta.id, pacienteId);
    } catch (error) {
      // Una cuenta sin ficha no le sirve a nadie y deja tomados su email y su
      // usuario para siempre.
      await this.usuarios.eliminar(cuenta.id);
      throw error;
    }
    return { tipo: "CUENTA_NUEVA", cuenta };
  }

  /** ¿La cuenta ya es dueña de alguna ficha de este consultorio? */
  private async tieneFichaAca(usuarioId: string): Promise<boolean> {
    // `obtenerPorId` ve las cuentas de pacientes con ficha en el consultorio
    // en curso, y nada más (ver `IUsuarioRepositorio`).
    return (await this.usuarios.obtenerPorId(usuarioId)) !== null;
  }
}

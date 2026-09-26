import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { Usuario } from "@/dominio/entidades/Usuario";

/** Lo que implica un email para la ficha que se está cargando. */
export interface RevisionEmail {
  /** Otras fichas del consultorio con ese email de contacto. */
  otrasFichas: { pacienteId: string; nombre: string }[];
  /** Ya es con lo que entra otra cuenta de este consultorio. */
  esIngresoDeOtraCuenta: boolean;
  /**
   * De quién es esa cuenta, visto desde ESTE consultorio: el nombre de su
   * ficha acá, o «tu cuenta de profesional». Sin esto, «lo usa otra cuenta»
   * no decía nada y parecía hablar de otro consultorio (una cuenta compartida
   * con otro consultorio también tiene su ficha acá).
   */
  ingresoDe: string | null;
}

/**
 * Caso de uso: revisar el email que el profesional está escribiendo en la
 * ficha de un paciente, antes de guardar.
 *
 * Contesta dos preguntas que la pantalla necesita para no confundir:
 *
 * 1. **¿Lo tiene otra ficha?** El email de contacto se puede repetir
 *    (migración 79, hermanos con el de la madre), pero repetido por error
 *    manda los avisos de un paciente a otra persona. La pantalla lo avisa con
 *    el nombre, para que el profesional confirme que es un familiar.
 * 2. **¿Sirve para entrar al portal?** Si ya es el ingreso de otra cuenta de
 *    ESTE consultorio, no: el paciente nuevo necesita un nombre de usuario, y
 *    la pantalla lo pide recién entonces (si no, el usuario es opcional).
 *
 * Mira SOLO el consultorio en curso: si el email es de una cuenta de otro
 * consultorio, eso no se dice acá (sería contarle a un profesional quién se
 * atiende con otro). Ese caso lo resuelve el alta con un código de invitación.
 */
export class RevisarEmailPaciente {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
  ) {}

  async ejecutar(
    email: string,
    /** La ficha que se está editando: ella misma no cuenta. */
    pacienteId: string | null = null,
  ): Promise<RevisionEmail> {
    const normalizado = email.trim().toLowerCase();
    const fichas = await this.pacientes.listarPorEmail(normalizado);
    const otras = fichas.filter((p) => p.id !== pacienteId);

    // `obtenerPorEmail` ve las cuentas del consultorio en curso (la del
    // profesional y las de pacientes con ficha acá), y nada más.
    const cuenta = await this.usuarios.obtenerPorEmail(normalizado);
    const cuentaPropia = pacienteId
      ? await this.usuarios.obtenerPorPacienteId(pacienteId)
      : null;

    const deOtra = cuenta !== null && cuenta.id !== cuentaPropia?.id;
    return {
      otrasFichas: otras.map((p) => ({
        pacienteId: p.id,
        nombre: p.nombreCompleto,
      })),
      esIngresoDeOtraCuenta: deOtra,
      ingresoDe: cuenta && deOtra ? await this.nombreAca(cuenta) : null,
    };
  }

  /**
   * El nombre con el que ESTE consultorio conoce a la dueña de la cuenta. Las
   * fichas de otros consultorios no se leen: el repositorio de pacientes está
   * acotado al consultorio en curso, así que para ellas devuelve null.
   */
  private async nombreAca(cuenta: Usuario): Promise<string | null> {
    if (!cuenta.esPaciente) return "tu cuenta de profesional";
    for (const consultorio of await this.cuentas.listarDeUsuario(cuenta.id)) {
      const ficha = await this.pacientes.obtenerPorId(consultorio.pacienteId);
      if (ficha) return ficha.nombreCompleto;
    }
    return null;
  }
}

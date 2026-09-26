import type { Usuario, RolUsuario } from "../entidades/Usuario";

/**
 * Contrato del repositorio de Usuario (puerto de salida del dominio).
 *
 * Lo consume Auth.js (a través del contenedor) para autenticar por email,
 * y los casos de uso de pacientes (que crean/actualizan/eliminan la cuenta
 * del paciente junto con su ficha).
 *
 * **Qué cuentas ve un consultorio.** La suya (la del NUTRICIONISTA) y las de
 * los pacientes que tienen acceso a alguna de SUS fichas. La cuenta de un
 * paciente no es de ningún consultorio (migración 78), así que el filtro de
 * inquilino no alcanza: la implementación lo resuelve por las fichas
 * (`pacientes.usuarioId`).
 * Con alcance global, todas.
 */
export interface IUsuarioRepositorio {
  crear(usuario: Usuario): Promise<Usuario>;
  actualizar(usuario: Usuario): Promise<Usuario>;
  obtenerPorId(id: string): Promise<Usuario | null>;
  obtenerPorEmail(email: string): Promise<Usuario | null>;
  /**
   * ¿Ese email ya tiene una cuenta EN TODA la plataforma?
   *
   * `obtenerPorEmail` mira solo el consultorio en curso, porque la extensión de
   * inquilino le agrega el filtro. Pero `usuarios.email` es único GLOBAL (una
   * persona puede ser paciente de dos consultorios, y son dos fichas, pero una
   * sola cuenta), así que ese chequeo dejaba pasar el alta y el choque aparecía
   * recién en el índice de Postgres: un error que no es de dominio, que caía en
   * el "Ocurrió un error inesperado" del middleware y que no le decía al
   * profesional lo único que necesitaba saber —que tiene que usar otro email—.
   *
   * Devuelve un BOOLEANO y no el usuario a propósito, igual que
   * `esFotoDePerfil`: quien pregunta necesita saber si el email está libre, no
   * de quién es. Devolver la cuenta filtraría datos de otro consultorio.
   */
  emailYaRegistrado(email: string): Promise<boolean>;
  /**
   * La cuenta con ese email en TODA la plataforma. Existe para UNA cosa:
   * vincular a un paciente que ya tiene cuenta (`CrearPaciente`). Nunca se
   * devuelve hacia la pantalla: de la cuenta de otro consultorio, al
   * profesional solo le llega que "ya tenía cuenta".
   */
  obtenerPorEmailGlobal(email: string): Promise<Usuario | null>;
  /** La cuenta dueña de esa ficha (`pacientes.usuarioId`). */
  obtenerPorPacienteId(pacienteId: string): Promise<Usuario | null>;
  /** Usuarios con un rol dado (ej. los NUTRICIONISTA para notificarles). */
  listarPorRol(rol: RolUsuario): Promise<Usuario[]>;
  /** Borra la cuenta y sus sesiones; sus fichas quedan sin portal (SET NULL). */
  eliminar(id: string): Promise<void>;
  /**
   * ¿Este archivo es la foto de perfil de alguna cuenta del consultorio?
   *
   * Es una pregunta de AUTORIZACIÓN, no un listado: un paciente puede ver la
   * foto de su nutricionista en el chat sin poder ver ningún otro archivo suyo.
   * Devuelve un booleano y no el usuario a propósito — quien pregunta no
   * necesita saber de quién es la foto, y devolverlo sería filtrar de más.
   */
  esFotoDePerfil(archivoId: string): Promise<boolean>;
}

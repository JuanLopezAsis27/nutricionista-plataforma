import type { Usuario, RolUsuario } from "../entidades/Usuario";

/**
 * Contrato del repositorio de Usuario (puerto de salida del dominio).
 *
 * Lo consume Auth.js (a través del contenedor) para autenticar por email,
 * y los casos de uso de pacientes (que crean/actualizan/eliminan la cuenta
 * del paciente junto con su ficha).
 */
export interface IUsuarioRepositorio {
  crear(usuario: Usuario): Promise<Usuario>;
  actualizar(usuario: Usuario): Promise<Usuario>;
  obtenerPorId(id: string): Promise<Usuario | null>;
  obtenerPorEmail(email: string): Promise<Usuario | null>;
  obtenerPorPacienteId(pacienteId: string): Promise<Usuario | null>;
  /** Usuarios con un rol dado (ej. los NUTRICIONISTA para notificarles). */
  listarPorRol(rol: RolUsuario): Promise<Usuario[]>;
  eliminarPorPacienteId(pacienteId: string): Promise<void>;
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

import type { Usuario } from "../entidades/Usuario";

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
  eliminarPorPacienteId(pacienteId: string): Promise<void>;
}

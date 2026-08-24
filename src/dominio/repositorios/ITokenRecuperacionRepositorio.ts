import type { TokenRecuperacion } from "../entidades/TokenRecuperacion";

/**
 * Contrato del repositorio de tokens de recuperación de contraseña.
 *
 * La tabla NO es de inquilino: se referencia por `usuarioId` (los usuarios son
 * globales, el email de login es único global), y el flujo de recuperación
 * corre con alcance global (como el login).
 */
export interface ITokenRecuperacionRepositorio {
  crear(token: TokenRecuperacion): Promise<TokenRecuperacion>;
  obtenerPorHash(tokenHash: string): Promise<TokenRecuperacion | null>;
  marcarUsado(id: string, usadoEn: Date): Promise<void>;
  /** Invalida (elimina) los tokens previos de un usuario. */
  eliminarDeUsuario(usuarioId: string): Promise<void>;
}

import type { TokenRefresco } from "../entidades/TokenRefresco";

/**
 * Contrato del repositorio de tokens de refresco (sesión persistente).
 *
 * Como el de recuperación, la tabla NO es de inquilino: se referencia por
 * `usuarioId` (los usuarios son globales) y el flujo corre con alcance global,
 * igual que el login.
 */
export interface ITokenRefrescoRepositorio {
  crear(token: TokenRefresco): Promise<TokenRefresco>;
  obtenerPorHash(tokenHash: string): Promise<TokenRefresco | null>;
  /** Consume el token: a partir de acá presentarlo es reutilización. */
  marcarUsado(id: string, usadoEn: Date): Promise<void>;
  /**
   * Revoca la cadena de rotación completa. Se llama ante una reutilización: no
   * se puede saber si el token repetido lo trajo el ladrón o el dueño, así que
   * caen los dos y el dueño vuelve a entrar con su contraseña.
   */
  revocarFamilia(familia: string, revocadoEn: Date): Promise<void>;
  /**
   * Revoca TODAS las sesiones persistentes del usuario. La usan el cierre de
   * sesión y los tres caminos por los que cambia una contraseña.
   */
  revocarDeUsuario(usuarioId: string, revocadoEn: Date): Promise<void>;
  /** Borra los que ya no sirven (vencidos o revocados hace rato). */
  eliminarCaducados(limite: Date): Promise<number>;
}

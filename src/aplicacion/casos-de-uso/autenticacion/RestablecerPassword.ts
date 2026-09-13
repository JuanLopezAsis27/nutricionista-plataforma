import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ErrorTokenInvalido } from "@/dominio/errores/ErrorTokenInvalido";

/** Entrada del caso de uso. */
export interface EntradaRestablecerPassword {
  token: string;
  nuevaPassword: string;
}

/**
 * Caso de uso: restablecer la contraseña con un token de recuperación.
 *
 * Verifica que el token (por su hash) exista, no haya sido usado y no haya
 * vencido. Si es válido, hashea la contraseña nueva, la guarda en el usuario y
 * marca el token como usado (un solo uso). Cualquier problema con el token se
 * reporta con el mismo error genérico (no filtra el motivo).
 *
 * Además **echa a todos los dispositivos**: revoca las sesiones persistentes
 * del usuario. Este es el camino del "olvidé mi contraseña", que es también el
 * que usa quien sospecha que le entraron a la cuenta; dejar viva la sesión
 * persistente del intruso —que no necesita la contraseña nueva para nada—
 * vaciaría de sentido el restablecimiento.
 */
export class RestablecerPassword {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly tokens: ITokenRecuperacionRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly hasheador: IHasheadorContrasena,
    private readonly reloj: IRelojFecha,
    private readonly tokensRefresco: ITokenRefrescoRepositorio,
  ) {}

  async ejecutar(entrada: EntradaRestablecerPassword): Promise<void> {
    const ahora = this.reloj.ahora();
    const hash = this.generador.hashear(entrada.token);

    const registro = await this.tokens.obtenerPorHash(hash);
    if (!registro || !registro.estaVigente(ahora)) {
      throw new ErrorTokenInvalido();
    }

    const usuario = await this.usuarios.obtenerPorId(registro.usuarioId);
    if (!usuario || !usuario.activo) {
      throw new ErrorTokenInvalido();
    }

    const passwordHash = await this.hasheador.hashear(entrada.nuevaPassword);
    await this.usuarios.actualizar(usuario.cambiarPassword(passwordHash));

    // Consumir el token para que no pueda reutilizarse.
    await this.tokens.marcarUsado(registro.id, ahora);

    // Y sacar de encima cualquier sesión persistente abierta (ver el encabezado).
    await this.tokensRefresco.revocarDeUsuario(usuario.id, ahora);
  }
}

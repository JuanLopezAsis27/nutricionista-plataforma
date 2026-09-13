import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

/** Entrada del caso de uso. */
export interface EntradaRevocarSesionesPersistentes {
  /** Revoca todas las sesiones persistentes de este usuario. */
  usuarioId?: string;
  /**
   * Revoca solo la cadena de este token (el dispositivo desde el que se cierra
   * sesión). Se pasa el token EN CLARO, como vino de la cookie.
   */
  token?: string;
}

/**
 * Caso de uso: dar de baja sesiones persistentes.
 *
 * Cubre los dos alcances que hacen falta, y la diferencia importa:
 *
 * - **Por token** — cerrar sesión en ESTE dispositivo. Cierra el que se usa y
 *   deja vivos el teléfono y la computadora de casa, que es lo que espera
 *   cualquiera que apriete "Cerrar sesión".
 * - **Por usuario** — echar a TODOS los dispositivos. Es lo que corresponde
 *   cuando cambia la contraseña: si alguien la cambia porque sospecha que se la
 *   robaron, dejar viva la sesión persistente del ladrón vacía el gesto de
 *   sentido. Vale para los tres caminos por los que una contraseña cambia.
 *
 * No falla si no hay nada que revocar: revocar es idempotente por definición.
 */
export class RevocarSesionesPersistentes {
  constructor(
    private readonly tokens: ITokenRefrescoRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(entrada: EntradaRevocarSesionesPersistentes): Promise<void> {
    const ahora = this.reloj.ahora();

    if (entrada.usuarioId) {
      await this.tokens.revocarDeUsuario(entrada.usuarioId, ahora);
      return;
    }

    if (entrada.token) {
      const registro = await this.tokens.obtenerPorHash(
        this.generador.hashear(entrada.token),
      );
      // Un token que no existe ya no da acceso: no hay nada que hacer y
      // tampoco hay por qué avisar.
      if (registro) {
        await this.tokens.revocarFamilia(registro.familia, ahora);
      }
    }
  }
}

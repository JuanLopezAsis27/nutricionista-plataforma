import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Caso de uso: borrar los tokens de refresco que ya no sirven.
 *
 * Cada renovación de sesión consume un token y emite otro, así que
 * `tokens_refresco` suma una fila por renovación. `eliminarCaducados` existía
 * pero nadie lo llamaba, y la tabla crecía para siempre. Lo corre el worker una
 * vez por día.
 *
 * No se borran apenas vencen o se revocan. Un token ya consumido que alguien
 * vuelve a presentar es la señal de robo que tumba la familia entera (ver
 * `RenovarSesion`), y esa señal sirve aunque el token haya vencido. Por eso se
 * conservan `margenDias` más —la misma validez de la sesión persistente— y
 * recién después se borran.
 */
export class LimpiarSesionesCaducadas {
  constructor(
    private readonly tokens: ITokenRefrescoRepositorio,
    private readonly reloj: IRelojFecha,
    private readonly margenDias: number,
  ) {}

  /** Devuelve cuántos tokens se borraron. */
  async ejecutar(): Promise<number> {
    const limite = new Date(
      this.reloj.ahora().getTime() - this.margenDias * DIA_MS,
    );
    return this.tokens.eliminarCaducados(limite);
  }
}

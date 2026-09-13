import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

/** Entrada del caso de uso: una notificación, o todas. */
export interface EntradaMarcarVista {
  /** Id de la notificación. Sin esto, se marcan TODAS las del consultorio. */
  id?: string;
}

/**
 * Caso de uso: marcar como vista una notificación, o todas.
 *
 * No falla si el id no existe ni si es de otro consultorio: el repositorio usa
 * `updateMany`, que en ese caso simplemente no toca nada. Es deliberado —lanzar
 * convertiría un id inventado en una forma de averiguar qué notificaciones
 * existen en otros consultorios— y además marcar algo ya visto no es un error
 * sino una repetición sin efecto.
 */
export class MarcarNotificacionVista {
  constructor(
    private readonly notificaciones: INotificacionRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(entrada: EntradaMarcarVista): Promise<{ marcadas: number }> {
    const ahora = this.reloj.ahora();

    if (entrada.id) {
      await this.notificaciones.marcarVista(entrada.id, ahora);
      return { marcadas: 1 };
    }

    const marcadas = await this.notificaciones.marcarTodasVistas(ahora);
    return { marcadas };
  }
}

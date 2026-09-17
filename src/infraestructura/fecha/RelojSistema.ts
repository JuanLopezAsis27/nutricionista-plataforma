import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";

/** Implementación del reloj con la hora real del sistema. */
export class RelojSistema implements IRelojFecha {
  ahora(): Date {
    return new Date();
  }

  /**
   * El día calendario LOCAL (la zona de `TZ`), expresado a medianoche UTC
   * porque así llegan las columnas DATE con las que se compara.
   *
   * Antes tomaba el día UTC. En Argentina (UTC-3), desde las 21:00 el día UTC
   * ya es el siguiente: el barrido de recordatorios —que corre cada hora desde
   * la hora de envío, y esa hora sí es local— calculaba "mañana" como pasado
   * mañana y mandaba a las 21:05 el aviso de "1 día antes" de un turno que era
   * dentro de dos días. Con los getters locales, el día y la hora salen del
   * mismo reloj que usan el cron y `yaEsHoraDeEnviar`.
   */
  hoy(): Date {
    const ahora = new Date();
    return new Date(
      Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
    );
  }
}

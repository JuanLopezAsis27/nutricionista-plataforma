/**
 * Puerto de reloj: abstrae "ahora" para que los casos de uso que razonan
 * sobre el tiempo (alertas, recordatorios, vencimientos) sean testeables
 * sin depender del reloj real.
 */
export interface IRelojFecha {
  /** Fecha y hora actuales. */
  ahora(): Date;

  /**
   * El día de hoy EN HORA LOCAL, a medianoche UTC (para comparar con campos de
   * solo fecha, que llegan así). No es el día UTC: a las 22:00 en Argentina
   * sigue siendo hoy, aunque en UTC ya sea mañana.
   */
  hoy(): Date;
}

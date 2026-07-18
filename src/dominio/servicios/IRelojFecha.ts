/**
 * Puerto de reloj: abstrae "ahora" para que los casos de uso que razonan
 * sobre el tiempo (alertas, recordatorios, vencimientos) sean testeables
 * sin depender del reloj real.
 */
export interface IRelojFecha {
  /** Fecha y hora actuales. */
  ahora(): Date;

  /** Fecha de hoy a medianoche UTC (para comparar con campos de solo fecha). */
  hoy(): Date;
}

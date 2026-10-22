/**
 * La zona horaria del consultorio, leída de `TZ`.
 *
 * La usan los procesos que necesitan nombrarla explícitamente en vez de
 * confiar en la del proceso: el planificador de pg-boss (ver
 * `trabajos/zonaHoraria.ts`) y la hora que encabeza cada línea del log
 * (`monitoreo/horaDelLog.ts`). Se lee del mismo `TZ` para que haya UN solo
 * lugar donde se declara la hora del consultorio.
 */
export const ZONA_HORARIA = process.env.TZ || "America/Argentina/Buenos_Aires";

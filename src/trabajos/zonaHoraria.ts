/**
 * Zona horaria con la que se programan los crons del worker.
 *
 * pg-boss interpreta toda expresión cron en **UTC** salvo que se le pase `tz`
 * explícitamente. Sin esto, un cron escrito como "las 7 de la mañana" corría a
 * las 4 hora local de Argentina, y el `.env` con `TZ` no lo cambiaba: `TZ`
 * afecta a `Date` dentro del proceso, no al planificador de pg-boss, que
 * calcula la próxima corrida en la base.
 *
 * Se lee del mismo `TZ` para que haya UN solo lugar donde se declara la hora
 * del consultorio.
 */
export const ZONA_HORARIA = process.env.TZ || "America/Argentina/Buenos_Aires";

/**
 * Normaliza a medianoche UTC: una medición pertenece a un DÍA, no a un
 * instante.
 *
 * Estaba copiado carácter por carácter como `private soloFecha` en ocho
 * repositorios. Es una regla de negocio —"la antropometría del 3 de marzo es
 * del 3 de marzo, no de las 14:32"— viviendo replicada en infraestructura: si
 * mañana el consultorio necesita zona horaria local, hay que cambiarla en un
 * solo lugar y no en ocho.
 */
export function soloFecha(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

/** Ídem, tolerando la ausencia: un `desde`/`hasta` sin cargar sigue en null. */
export function soloFechaOpcional(fecha: Date | null): Date | null {
  return fecha == null ? null : soloFecha(fecha);
}

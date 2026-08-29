import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Alcance de inquilino (tenant) de la operación en curso.
 * - `nutricionista`: filtra/asigna todo por ese `nutricionistaId`.
 * - `global`: sin filtro (SUPERADMIN, login, worker que recorre inquilinos).
 */
export type AlcanceTenant =
  { tipo: "nutricionista"; nutricionistaId: string } | { tipo: "global" };

const almacen = new AsyncLocalStorage<AlcanceTenant>();

/**
 * Corre `fn` con el alcance acotado a un nutricionista (inquilino).
 *
 * El callback se envuelve en `async () => await fn()` a propósito: garantiza que
 * incluso una PrismaPromise perezosa se EJECUTE dentro del contexto activo (si
 * el callback solo la devolviera sin await, `run` restauraría el alcance antes
 * de que la query corriera y la extensión no vería el inquilino).
 */
export function ejecutarEnNutricionista<T>(
  nutricionistaId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return almacen.run(
    { tipo: "nutricionista", nutricionistaId },
    async () => await fn(),
  );
}

/** Corre `fn` con alcance global (sin filtro por inquilino). */
export function ejecutarGlobal<T>(fn: () => Promise<T>): Promise<T> {
  return almacen.run({ tipo: "global" }, async () => await fn());
}

/**
 * Fija el alcance para el resto del contexto asíncrono actual (una request).
 * Se usa en el contexto de tRPC, donde no hay un callback que envolver.
 */
export function fijarAlcance(alcance: AlcanceTenant): void {
  almacen.enterWith(alcance);
}

/** Alcance vigente (undefined si no se estableció ninguno). */
export function alcanceActual(): AlcanceTenant | undefined {
  return almacen.getStore();
}

import { cookies } from "next/headers";

/**
 * El consultorio que eligió el paciente en ESTE dispositivo (migración 78).
 *
 * Quien se atiende con dos profesionales elige en cuál trabajar, y la app lo
 * recuerda por dispositivo: el teléfono puede quedarse en uno y la computadora
 * en el otro. Lo lee todo lo que emite una sesión —el login, la renovación con
 * el token de refresco y el cambio de consultorio— y NINGUNO confía en él:
 * `ResolverConsultorioActivo` lo revalida contra las fichas de la cuenta,
 * porque una cookie vieja puede nombrar una ficha que ya se borró.
 *
 * Guarda el `pacienteId` de la ficha elegida. `httpOnly`: ningún script lo lee
 * ni lo escribe; cambia solo por `/api/autenticacion/consultorio`.
 *
 * Runtime Node únicamente (usa `next/headers` en un route handler o en el
 * `authorize` de Auth.js).
 */

const EN_PRODUCCION = process.env.NODE_ENV === "production";

/** Mismo criterio de prefijo que la cookie de refresco (ver cookieRefresco). */
const NOMBRE_COOKIE_CONSULTORIO = EN_PRODUCCION
  ? "__Host-consultorio"
  : "consultorio";

/** Un año: es una preferencia, no una credencial. */
const DURACION_MS = 365 * 24 * 60 * 60 * 1000;

/** La última ficha elegida en este dispositivo, o null. */
export async function consultorioPreferido(): Promise<string | null> {
  try {
    const almacen = await cookies();
    return almacen.get(NOMBRE_COOKIE_CONSULTORIO)?.value || null;
  } catch {
    // Fuera de una request (tests, scripts) no hay cookies: no hay preferencia.
    return null;
  }
}

/** Recuerda la ficha elegida en este dispositivo. */
export async function recordarConsultorio(pacienteId: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE_CONSULTORIO, pacienteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: EN_PRODUCCION,
    path: "/",
    expires: new Date(Date.now() + DURACION_MS),
  });
}

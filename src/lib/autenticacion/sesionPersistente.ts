import { cookies } from "next/headers";

import { servicioAutenticacion } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import {
  NOMBRE_COOKIE_REFRESCO,
  opcionesCookieRefresco,
  opcionesBorradoCookieRefresco,
} from "./cookieRefresco";
import type { RolUsuario } from "@/dominio/entidades/Usuario";

/**
 * El puente entre Auth.js y el servicio de sesiones persistentes.
 *
 * Acá vive TODO lo que toca la cookie de refresco del lado del servidor, por la
 * misma razón por la que el nombre vive en un solo archivo: son tres momentos
 * distintos (login, renovación, cierre) y los tres tienen que escribir la misma
 * cookie con las mismas opciones.
 *
 * Runtime Node únicamente: importa el contenedor, que arrastra Prisma.
 *
 * **Todo corre en `ejecutarGlobal`.** `Usuario` es tabla de inquilino y en
 * estos tres momentos todavía no hay inquilino resuelto —es exactamente la
 * situación del login—, así que sin alcance global la extensión de Prisma falla
 * cerrado. `TokenRefresco` no es de inquilino (se referencia por `usuarioId`),
 * igual que `TokenRecuperacion`.
 */

/** Lo que Auth.js necesita para armar el JWT. */
export interface IdentidadRenovada {
  id: string;
  email: string;
  rol: RolUsuario;
  pacienteId: string | null;
  nutricionistaId: string | null;
}

/** User-Agent del dispositivo, para que la sesión sea reconocible. */
function dispositivoDe(peticion: Request | undefined): string | null {
  return peticion?.headers.get("user-agent") ?? null;
}

/**
 * Abre la sesión persistente después de un login correcto.
 *
 * Nunca hace fallar el login: si esto se cae, la persona ya entró y lo único
 * que pierde es no volver a entrar sin contraseña dentro de 12 h. Negarle el
 * acceso por eso sería cambiar un problema de comodidad por uno de acceso.
 */
export async function abrirSesionPersistente(
  usuarioId: string,
  peticion: Request | undefined,
): Promise<void> {
  try {
    const { token, expiraEn } = await ejecutarGlobal(() =>
      servicioAutenticacion().abrirSesionPersistente({
        usuarioId,
        dispositivo: dispositivoDe(peticion),
      }),
    );
    const almacen = await cookies();
    almacen.set(
      NOMBRE_COOKIE_REFRESCO,
      token,
      opcionesCookieRefresco(expiraEn),
    );
  } catch (error) {
    console.error("[auth] no se pudo abrir la sesión persistente:", error);
  }
}

/**
 * Canjea la cookie de refresco por una identidad, y deja la cookie ROTADA.
 *
 * Devuelve `null` si no hay cookie o si el token no sirve —vencido, revocado,
 * reutilizado o de una cuenta dada de baja—; en ese caso borra la cookie, para
 * que el intento no se repita en cada navegación.
 *
 * La cookie nueva se escribe ACÁ y no en el llamador a propósito: emitir la
 * sesión sin guardar el token rotado dejaría al usuario con una cadena
 * interrumpida —entra hoy y mañana vuelve a la pantalla de login—, así que las
 * dos cosas tienen que pasar juntas o no pasar.
 */
export async function renovarDesdeCookie(
  peticion: Request | undefined,
): Promise<IdentidadRenovada | null> {
  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE_REFRESCO)?.value;
  if (!token) return null;

  try {
    const renovada = await ejecutarGlobal(() =>
      servicioAutenticacion().renovarSesion({
        token,
        dispositivo: dispositivoDe(peticion),
      }),
    );
    almacen.set(
      NOMBRE_COOKIE_REFRESCO,
      renovada.token,
      opcionesCookieRefresco(renovada.expiraEn),
    );
    return renovada.usuario;
  } catch {
    // El motivo no se distingue a propósito (ver ErrorTokenInvalido): desde
    // acá, un token vencido y uno robado terminan igual.
    await borrarCookieRefresco();
    return null;
  }
}

/**
 * Cierra la sesión persistente de este dispositivo: revoca la cadena en la base
 * y borra la cookie. Los demás dispositivos del usuario siguen entrando solos,
 * que es lo que espera quien aprieta "Cerrar sesión" en una computadora.
 */
export async function cerrarSesionPersistente(): Promise<void> {
  const almacen = await cookies();
  const token = almacen.get(NOMBRE_COOKIE_REFRESCO)?.value;

  if (token) {
    try {
      await ejecutarGlobal(() =>
        servicioAutenticacion().cerrarSesionPersistente(token),
      );
    } catch (error) {
      // Que falle la revocación no puede impedir el cierre de sesión: la
      // cookie se borra igual y el token queda huérfano hasta que venza.
      console.error("[auth] no se pudo revocar el token de refresco:", error);
    }
  }
  await borrarCookieRefresco();
}

/** Borra la cookie con las MISMAS opciones con las que se escribió. */
export async function borrarCookieRefresco(): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE_REFRESCO, "", opcionesBorradoCookieRefresco());
}

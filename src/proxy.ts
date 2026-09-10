import NextAuth from "next-auth";
import { authConfig } from "@/lib/autenticacion/auth.config";

/**
 * Middleware de Next.js que protege las rutas.
 *
 * Usa SOLO authConfig (sin el provider de credenciales, que no corre en Edge).
 * El callback `authorized` de authConfig decide el acceso: las rutas
 * /dashboard/*, /mis-* y /mi-* exigen sesión iniciada y, si no la hay,
 * redirigen a /login.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  /**
   * Aplica a todo salvo assets estáticos y los endpoints internos.
   *
   * Los archivos de la PWA (`sw.js`, `manifest.webmanifest`, `iconos/`) quedan
   * afuera a propósito: el navegador los pide SIN cookies —el service worker se
   * descarga en un contexto propio—, así que pasarlos por Auth.js es decodificar
   * un JWT que no está para terminar dejándolos pasar igual. Además, el chequeo
   * de actualización del worker ocurre en cada navegación.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|iconos/|favicon.ico).*)",
  ],
};

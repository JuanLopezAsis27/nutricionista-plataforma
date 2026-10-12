import { NextResponse } from "next/server";
import { CredentialsSignin } from "next-auth";

import { signIn } from "@/lib/autenticacion/auth";
import {
  ID_PROVEEDOR_REFRESCO,
  PARAMETRO_DESTINO,
  PARAMETRO_SESION_EXPIRADA,
} from "@/lib/autenticacion/cookieRefresco";
import { borrarCookieRefresco } from "@/lib/autenticacion/sesionPersistente";
import { destinoSeguro } from "@/lib/autenticacion/destinoSeguro";
import { urlApp } from "@/infraestructura/contenedor/contenedor";

export const runtime = "nodejs";

/**
 * GET /api/autenticacion/renovar — canjea la cookie de refresco por una sesión
 * nueva y devuelve a la persona a donde iba.
 *
 * Lo invoca el middleware cuando alguien pide una ruta protegida sin sesión
 * pero con cookie de refresco (ver `authorized` en `auth.config.ts`). Desde
 * afuera se ve como una redirección de más; desde adentro es lo que evita que
 * volver a la app después de un fin de semana termine en la pantalla de login.
 *
 * **Por qué pasa por `signIn` en vez de firmar el JWT a mano.** Emitir la
 * sesión es exactamente lo que hace Auth.js al iniciar sesión: firmar el token
 * con `AUTH_SECRET`, con el nombre de cookie que corresponda al esquema
 * (`__Secure-` o no), pasando por los callbacks `jwt` y `session` que llenan
 * rol, paciente e inquilino. Reimplementar eso acá sería mantener una copia de
 * las decisiones de la librería que se desincroniza en la primera actualización
 * —y el modo de fallar sería una sesión que parece válida y no lo es—. El
 * provider `refresco` valida y rota la cookie; Auth.js se encarga del resto.
 *
 * El runtime es Node porque el provider toca Prisma.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const destino = destinoSeguro(
    new URL(request.url).searchParams.get(PARAMETRO_DESTINO),
    urlApp(),
  );

  // `redirect: false` porque la redirección la arma este handler con
  // `urlApp()`: `signIn` redirige con lo que venga en las cabeceras.
  //
  // Se tipa `unknown` a mano: con `redirect: false`, Auth.js declara el retorno
  // como `any`, y dejar que eso se propague apagaría el chequeo de tipos de
  // todo lo que toque el resultado.
  const resultado: unknown = await canjear();

  if (fracaso(resultado)) {
    // La cookie ya la borró `renovarDesdeCookie`; se insiste por si el fallo
    // ocurrió antes de llegar ahí. Sin esto, cada navegación volvería a
    // intentar la renovación y a dar la misma vuelta para nada.
    await borrarCookieRefresco();
    // El parámetro le dice a `/login` que no vuelva a intentar renovar: sin él
    // los dos se mandarían al otro indefinidamente si la cookie sobreviviera.
    return NextResponse.redirect(
      new URL(`/login?${PARAMETRO_SESION_EXPIRADA}=1`, urlApp()),
    );
  }

  // El `Location` sale de `urlApp()` y NUNCA de `request.url`: es absoluto, y
  // `request.url` se arma con el `Host` que le haya llegado al proceso —detrás
  // del proxy, `0.0.0.0:3000`—. Mismo motivo que en el callback de Google.
  return NextResponse.redirect(new URL(destino, urlApp()));
}

/**
 * Llama al provider `refresco` y devuelve lo que diga `signIn`, o `null` si el
 * token no sirvió.
 *
 * **Un token que no sirve LANZA, no vuelve en la URL.** El `signIn` del
 * servidor llama a Auth.js en modo `raw`, y en ese modo un `CredentialsSignin`
 * (el `authorize` devolvió `null`) se relanza en vez de convertirse en un
 * `?error=` (`@auth/core`, `Auth()`). Sin este `catch` el handler moría con un
 * 500 y —peor— la cookie borrada en `renovarDesdeCookie` no llegaba al
 * navegador, porque las cookies de `cookies()` viajan en la respuesta que el
 * handler nunca devolvió: cada visita volvía a pasar por acá y a dar 500, y el
 * paciente no podía ni llegar al login (pasó en producción, 2026-10-12).
 *
 * Solo se ataja `CredentialsSignin`, que es el "este token no sirve" esperado.
 * Cualquier otro error es de configuración y tiene que llegar al monitor.
 */
async function canjear(): Promise<unknown> {
  try {
    return await signIn(ID_PROVEEDOR_REFRESCO, { redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) return null;
    throw error;
  }
}

/**
 * ¿La renovación falló?
 *
 * `null` es el `CredentialsSignin` que ataja `canjear`. Si no, con
 * `redirect: false` `signIn` devuelve la URL a la que habría mandado al
 * navegador: con `error` en la query si algo falló sin lanzar, el
 * `callbackUrl` limpio si salió bien.
 */
function fracaso(resultado: unknown): boolean {
  if (typeof resultado !== "string") return true;
  try {
    return new URL(resultado, urlApp()).searchParams.has("error");
  } catch {
    return true;
  }
}

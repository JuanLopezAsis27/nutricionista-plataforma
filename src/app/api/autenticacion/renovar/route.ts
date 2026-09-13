import { NextResponse } from "next/server";

import { signIn } from "@/lib/autenticacion/auth";
import {
  ID_PROVEEDOR_REFRESCO,
  PARAMETRO_DESTINO,
  PARAMETRO_SESION_EXPIRADA,
} from "@/lib/autenticacion/cookieRefresco";
import { borrarCookieRefresco } from "@/lib/autenticacion/sesionPersistente";
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
  const destino = destinoSeguro(request);

  // `redirect: false` porque la redirección la arma este handler con
  // `urlApp()`: `signIn` redirige con lo que venga en las cabeceras.
  //
  // Se tipa `unknown` a mano: con `redirect: false`, Auth.js declara el retorno
  // como `any`, y dejar que eso se propague apagaría el chequeo de tipos de
  // todo lo que toque el resultado.
  const resultado: unknown = await signIn(ID_PROVEEDOR_REFRESCO, {
    redirect: false,
  });

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
 * A dónde volver después de renovar.
 *
 * El valor llega en la query, así que lo elige quien arma el enlace: si se
 * usara tal cual, `/api/autenticacion/renovar?destino=https://otro-sitio` sería
 * un redirector abierto con la marca del consultorio —y de los que además
 * entregan al visitante recién autenticado—. Solo se aceptan rutas internas:
 * una sola barra al principio (`//otro-sitio` es un protocolo relativo, no una
 * ruta) y nada de esquema.
 */
function destinoSeguro(request: Request): string {
  const pedido = new URL(request.url).searchParams.get(PARAMETRO_DESTINO);

  if (!pedido || !pedido.startsWith("/") || pedido.startsWith("//")) {
    return "/dashboard";
  }
  return pedido;
}

/**
 * ¿La renovación falló?
 *
 * Con `redirect: false`, `signIn` devuelve la URL a la que habría mandado al
 * navegador. Cuando el `authorize` del provider devuelve `null`, Auth.js arma
 * esa URL con un `error` en la query; cuando sale bien, es el `callbackUrl`
 * limpio. Es la única señal que da: no lanza ni devuelve un booleano.
 */
function fracaso(resultado: unknown): boolean {
  if (typeof resultado !== "string") return true;
  try {
    return new URL(resultado, urlApp()).searchParams.has("error");
  } catch {
    return true;
  }
}

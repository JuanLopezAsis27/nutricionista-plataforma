import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

import {
  NOMBRE_COOKIE_REFRESCO,
  RUTA_RENOVAR_SESION,
  PARAMETRO_DESTINO,
} from "./cookieRefresco";

/**
 * Configuración base de Auth.js compatible con el Edge Runtime.
 *
 * NO incluye el proveedor de credenciales (que usa bcrypt y Prisma, no
 * disponibles en Edge): eso se añade en auth.ts. El middleware de Next.js
 * importa SOLO esta configuración, porque corre en Edge.
 *
 * Aquí viven las páginas, la estrategia de sesión (JWT) y el callback
 * `authorized` que decide el acceso a las rutas protegidas.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    /**
     * 12 horas, no los 30 días que trae Auth.js por defecto.
     *
     * Con estrategia JWT la sesión no se puede revocar del lado del servidor:
     * el token es válido hasta que vence, y punto. Eso convertía la duración
     * por defecto en una ventana de un mes durante la cual una cuenta dada de
     * baja seguía entrando. La duración corta es la primera mitad de la
     * defensa; la segunda es `verificarSesionVigente`, que revalida contra la
     * base en cada request (ver src/lib/autenticacion/sesion.ts).
     *
     * 12 h cubre una jornada completa del consultorio sin obligar a reingresar
     * en el medio de la atención.
     */
    maxAge: 12 * 60 * 60,
    /**
     * Renueva el token si pasó más de 1 hora desde la última renovación. Sin
     * esto, `maxAge` sería un corte duro a las 12 h aunque la persona estuviera
     * trabajando; con esto, la sesión activa se extiende sola y solo caduca de
     * verdad tras 12 h de inactividad.
     */
    updateAge: 60 * 60,
  },
  callbacks: {
    /**
     * Propaga id, rol y pacienteId al token y a la sesión, para que el
     * contexto de tRPC y la UI los lean de forma tipada.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
        token.pacienteId = user.pacienteId;
        token.nutricionistaId = user.nutricionistaId;
      }
      // Compat con sesiones viejas (pre multi-inquilino): el NUTRICIONISTA es su
      // propio inquilino, así que su nutricionistaId se deriva de su id sin DB.
      if (token.nutricionistaId == null && token.rol === "NUTRICIONISTA") {
        token.nutricionistaId = token.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.rol = token.rol;
        session.user.pacienteId = token.pacienteId;
        session.user.nutricionistaId = token.nutricionistaId;
      }
      return session;
    },
    /**
     * Controla el acceso a las rutas desde el middleware.
     * Las rutas /dashboard/* y /mis-* exigen sesión iniciada.
     *
     * **Es también el disparador de la sesión persistente.** Si no hay sesión
     * pero sí cookie de refresco, en vez de mandar al login se desvía a
     * `/api/autenticacion/renovar`, que la canjea por una sesión nueva y
     * devuelve a la persona a donde iba. Es el momento exacto en que hace
     * falta: alguien que vuelve a la app después de más de 12 h y clava en el
     * login sin ninguna razón que él pueda entender.
     *
     * Acá solo se mira si la cookie EXISTE. El middleware corre en el Edge
     * Runtime, donde no hay Prisma ni `node:crypto`, así que validar es
     * imposible; de eso se ocupa el route handler, que corre en Node. En el
     * peor caso —una cookie vieja o inválida— se paga una redirección de más y
     * se termina igual en el login, con la cookie ya borrada para que no se
     * repita.
     *
     * `/api/*` está fuera del `matcher` del middleware (ver `proxy.ts`), así
     * que el destino de la redirección no vuelve a pasar por acá y no hay
     * riesgo de bucle.
     */
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const estaLogueado = !!auth?.user;
      const rutaProtegida =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/mis-") ||
        nextUrl.pathname.startsWith("/mi-");

      if (!rutaProtegida) return true;
      if (estaLogueado) return true;

      if (request.cookies.has(NOMBRE_COOKIE_REFRESCO)) {
        const renovar = new URL(RUTA_RENOVAR_SESION, nextUrl.origin);
        // A dónde volver: se manda solo la parte relativa, y el handler la
        // vuelve a validar antes de usarla.
        renovar.searchParams.set(
          PARAMETRO_DESTINO,
          `${nextUrl.pathname}${nextUrl.search}`,
        );
        return NextResponse.redirect(renovar);
      }

      return false; // sin sesión ni cookie: al login
    },
  },
  // El array de proveedores se completa en auth.ts.
  providers: [],
} satisfies NextAuthConfig;

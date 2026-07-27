import type { NextAuthConfig } from "next-auth";

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
     */
    authorized({ auth, request: { nextUrl } }) {
      const estaLogueado = !!auth?.user;
      const rutaProtegida =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/admin") ||
        nextUrl.pathname.startsWith("/mis-") ||
        nextUrl.pathname.startsWith("/mi-");

      if (rutaProtegida) {
        return estaLogueado; // si no está logueado, redirige a /login
      }
      return true;
    },
  },
  // El array de proveedores se completa en auth.ts.
  providers: [],
} satisfies NextAuthConfig;

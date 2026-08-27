import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { repositorioUsuarioCompartido } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { limitadorLogin } from "@/infraestructura/seguridad/LimitadorIntentos";

/** IP de origen de la request (detrás de nginx viene en x-forwarded-for). */
function ipDeSolicitud(peticion: Request | undefined): string {
  const reenviada = peticion?.headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0]!.trim();
  return peticion?.headers.get("x-real-ip")?.trim() || "desconocida";
}

/**
 * Configuración completa de Auth.js v5 (runtime Node).
 *
 * Añade el CredentialsProvider sobre la configuración base. La verificación
 * de la contraseña usa bcrypt contra el passwordHash guardado (nunca se
 * almacena ni compara texto plano). El usuario se obtiene a través del
 * repositorio del dominio (DIP), no consultando Prisma directamente acá.
 *
 * Exporta:
 *   - handlers → para el route handler de /api/auth/[...nextauth]
 *   - auth     → para leer la sesión en el servidor (contexto tRPC, RSC)
 *   - signIn / signOut → acciones de servidor
 */
const credencialesDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credenciales, peticion) {
        const resultado = credencialesDto.safeParse(credenciales);
        if (!resultado.success) {
          return null;
        }

        const { email, password } = resultado.data;
        const claveIp = `ip:${ipDeSolicitud(peticion)}`;
        const claveEmail = `email:${email.trim().toLowerCase()}`;

        // Rate-limiting anti fuerza bruta: si la IP o el email están bloqueados
        // por demasiados fallos, se rechaza sin siquiera verificar la contraseña
        // (evita también el gasto de CPU de bcrypt como vector de DoS).
        if (
          limitadorLogin.estaBloqueada(claveIp).bloqueada ||
          limitadorLogin.estaBloqueada(claveEmail).bloqueada
        ) {
          return null;
        }

        // El login busca por email GLOBALMENTE (aún no hay inquilino resuelto).
        const usuario = await ejecutarGlobal(() =>
          repositorioUsuarioCompartido().obtenerPorEmail(email),
        );
        if (!usuario || !usuario.activo) {
          limitadorLogin.registrarFallo(claveIp);
          limitadorLogin.registrarFallo(claveEmail);
          return null;
        }

        const coincide = await bcrypt.compare(password, usuario.passwordHash);
        if (!coincide) {
          limitadorLogin.registrarFallo(claveIp);
          limitadorLogin.registrarFallo(claveEmail);
          return null;
        }

        // Login correcto: limpiar los contadores de esta IP/email.
        limitadorLogin.registrarExito(claveIp);
        limitadorLogin.registrarExito(claveEmail);

        // El objeto devuelto alimenta el callback jwt (ver auth.config.ts).
        return {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          pacienteId: usuario.pacienteId,
          nutricionistaId: usuario.nutricionistaId,
        };
      },
    }),
  ],
});

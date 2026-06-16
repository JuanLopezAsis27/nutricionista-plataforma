import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { repositorioUsuarioCompartido } from "@/infraestructura/contenedor/contenedor";

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
      async authorize(credenciales) {
        const resultado = credencialesDto.safeParse(credenciales);
        if (!resultado.success) {
          return null;
        }

        const { email, password } = resultado.data;
        const usuario = await repositorioUsuarioCompartido.obtenerPorEmail(email);
        if (!usuario) {
          return null;
        }

        const coincide = await bcrypt.compare(password, usuario.passwordHash);
        if (!coincide) {
          return null;
        }

        // El objeto devuelto alimenta el callback jwt (ver auth.config.ts).
        return {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          pacienteId: usuario.pacienteId,
        };
      },
    }),
  ],
});

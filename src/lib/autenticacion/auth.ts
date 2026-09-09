import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { repositorioUsuarioCompartido } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { limitadorLogin } from "@/infraestructura/seguridad/LimitadorIntentos";
import {
  RONDAS_BCRYPT,
  necesitaRehash,
} from "@/infraestructura/seguridad/BcryptHasheador";

/**
 * IP de origen de la request.
 *
 * El orden importa y antes estaba al revés. `X-Forwarded-For` es una lista que
 * cada proxy va ANEXANDO, así que el primer elemento es el que puso el cliente:
 * es un dato que el atacante controla por completo. Leerlo primero convertía el
 * límite de intentos por IP en decorativo — bastaba mandar un
 * `X-Forwarded-For: <aleatorio>` distinto en cada intento para que cada uno
 * cayera en un contador nuevo y el bloqueo no se disparara nunca.
 *
 * `X-Real-IP` lo escribe nuestro nginx con `$remote_addr` (ver
 * docs/nginx.conf.ejemplo), pisando cualquier valor que venga de afuera, así
 * que es la fuente confiable. Se lee primero.
 *
 * Si no está —despliegue sin ese proxy— se cae a `X-Forwarded-For` pero
 * tomando el ÚLTIMO elemento, que es el que agregó el proxy más cercano y no
 * el que eligió el cliente.
 */
function ipDeSolicitud(peticion: Request | undefined): string {
  const real = peticion?.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const reenviada = peticion?.headers.get("x-forwarded-for");
  if (reenviada) {
    const partes = reenviada
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1]!;
  }
  return "desconocida";
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

        // Re-hasheo transparente: si la contraseña quedó guardada con un costo
        // más bajo que el actual, se regraba con el nuevo. Es el único momento
        // en que existe la contraseña en claro, así que es la única
        // oportunidad de migrar el hash sin pedirle nada al usuario.
        //
        // Va en try/catch a propósito y sin `await` bloqueante del resultado
        // lógico: si esto falla, el login ya fue correcto y no hay ninguna
        // razón para negarlo. El hash viejo sigue funcionando.
        if (necesitaRehash(usuario.passwordHash)) {
          try {
            const nuevoHash = await bcrypt.hash(password, RONDAS_BCRYPT);
            await ejecutarGlobal(() =>
              repositorioUsuarioCompartido().actualizar(
                usuario.cambiarPassword(nuevoHash),
              ),
            );
          } catch {
            // Se reintentará en el próximo login.
          }
        }

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

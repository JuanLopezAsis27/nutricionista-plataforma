import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import {
  repositorioUsuarioCompartido,
  servicioAutenticacion,
} from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { limitadorLogin } from "@/infraestructura/seguridad/LimitadorIntentos";
import {
  RONDAS_BCRYPT,
  necesitaRehash,
} from "@/infraestructura/seguridad/BcryptHasheador";
import {
  abrirSesionPersistente,
  renovarDesdeCookie,
  cerrarSesionPersistente,
} from "./sesionPersistente";
import { ID_PROVEEDOR_REFRESCO } from "./cookieRefresco";
import { CODIGO_LOGIN_BLOQUEADO, CODIGO_LOGIN_INACTIVA } from "./codigosLogin";
import { consultorioPreferido } from "./consultorioActivo";

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

/**
 * Error de login que sí lleva un motivo.
 *
 * `authorize` no puede devolver un mensaje: o hay usuario o hay `null`, y
 * `null` sale siempre como el mismo `CredentialsSignin`. El `code` de un error
 * propio es el único canal que llega hasta el formulario. Los motivos
 * declarados —y por qué solo esos dos— están en `codigosLogin.ts`.
 */
class ErrorLoginConMotivo extends CredentialsSignin {
  constructor(codigo: string) {
    super();
    this.code = codigo;
  }
}

/** La ficha que nombra un `update({ user: { pacienteId } })`, si la nombra. */
function fichaPedida(pedido: unknown): string | null {
  if (typeof pedido !== "object" || pedido === null) return null;
  const usuario = (pedido as { user?: unknown }).user;
  if (typeof usuario !== "object" || usuario === null) return null;
  const pacienteId = (usuario as { pacienteId?: unknown }).pacienteId;
  return typeof pacienteId === "string" && pacienteId ? pacienteId : null;
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Sobre el `jwt` de `auth.config.ts`, la reemisión por cambio de
     * consultorio (`trigger === "update"`, la dispara
     * `/api/autenticacion/consultorio`).
     *
     * **Lo que manda el cliente es solo una PREFERENCIA.** `update(datos)`
     * también se puede llamar desde cualquier script de la página, con lo que
     * quiera; por eso `datos` nunca se copia al token. Se lee la ficha que
     * nombra (o, si no nombra ninguna, la cookie del consultorio elegido) y la
     * identidad se vuelve a resolver desde la base: `ResolverConsultorioActivo`
     * solo acepta una ficha de ESTA cuenta. Nombrar la de
     * otra persona no abre nada; a lo sumo deja la sesión sin consultorio.
     *
     * Vive acá y no en `auth.config.ts` porque necesita la base: aquel archivo
     * lo importa el middleware, que corre en Edge.
     */
    async jwt(parametros) {
      const token = authConfig.callbacks.jwt(parametros);
      if (parametros.trigger !== "update" || !token.id) return token;

      const pedido: unknown = parametros.session;
      const preferido = fichaPedida(pedido) ?? (await consultorioPreferido());
      const identidad = await ejecutarGlobal(() =>
        servicioAutenticacion().identidadDeSesion(token.id, preferido),
      );
      if (!identidad) return token;
      token.rol = identidad.rol;
      token.pacienteId = identidad.pacienteId;
      token.nutricionistaId = identidad.nutricionistaId;
      return token;
    },
  },
  logger: {
    error(error) {
      console.error(`[auth] ${error.name}: ${error.message}`);
    },
  },
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
          // Con motivo: el bloqueo no dice nada de ninguna cuenta y, sin
          // saberlo, la persona sigue probando contra una puerta trabada.
          throw new ErrorLoginConMotivo(CODIGO_LOGIN_BLOQUEADO);
        }

        // El login busca por email GLOBALMENTE (aún no hay inquilino resuelto).
        const usuario = await ejecutarGlobal(() =>
          repositorioUsuarioCompartido().obtenerPorEmail(email),
        );
        if (!usuario) {
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

        // La baja se informa recién ACÁ, con la contraseña ya verificada.
        // Antes se miraba junto con la existencia del usuario, así que daba lo
        // mismo: las dos salían como "credenciales incorrectas" y alguien dado
        // de baja se quedaba probando contraseñas que estaban bien. Moverlo
        // después del `compare` es lo que permite decirle la verdad sin
        // confirmarle a un desconocido que la cuenta existe.
        if (!usuario.activo) {
          limitadorLogin.registrarFallo(claveIp);
          limitadorLogin.registrarFallo(claveEmail);
          throw new ErrorLoginConMotivo(CODIGO_LOGIN_INACTIVA);
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
                // La misma contraseña con otro costo: no deja de ser
                // provisional por esto.
                usuario.rehashearPassword(nuevoHash),
              ),
            );
          } catch {
            // Se reintentará en el próximo login.
          }
        }

        // Abrir la sesión persistente: es el único momento en que se probó la
        // contraseña, así que es cuando corresponde entregar la credencial que
        // evita volver a pedirla. No puede hacer fallar el login (ver ahí).
        await abrirSesionPersistente(usuario.id, peticion);

        // El objeto devuelto alimenta el callback jwt (ver auth.config.ts).
        // Para un paciente, `pacienteId`/`nutricionistaId` son los del
        // consultorio en el que arranca: el único que tiene, o el que eligió
        // la última vez en este dispositivo. Con varios y sin elección, van en
        // null y el portal le pide que elija.
        const identidad = await ejecutarGlobal(async () =>
          servicioAutenticacion().identidadDeSesion(
            usuario.id,
            await consultorioPreferido(),
          ),
        );
        return identidad;
      },
    }),

    /**
     * Sesión persistente: emite una sesión a partir de la cookie de refresco,
     * sin contraseña. Lo invoca el route handler `/api/autenticacion/renovar`
     * (ver `cookieRefresco.ts` sobre por qué es un provider aparte).
     *
     * No declara `credentials`: todo lo que necesita viaja en una cookie
     * httpOnly que el cliente no puede leer ni fabricar. Un formulario vacío es
     * justamente lo que se quiere —no hay ningún dato del usuario en el que
     * confiar—.
     */
    Credentials({
      id: ID_PROVEEDOR_REFRESCO,
      name: "Sesión persistente",
      credentials: {},
      async authorize(_credenciales, peticion) {
        // Valida, rota la cookie y devuelve quién es; `null` si no sirve.
        return await renovarDesdeCookie(peticion);
      },
    }),
  ],

  events: {
    /**
     * Cerrar sesión tiene que llevarse puesto el token de refresco.
     *
     * Sin esto, "Cerrar sesión" borraría el JWT y dejaría viva la cookie de
     * refresco: la siguiente navegación a una ruta protegida la canjearía por
     * una sesión nueva y la persona volvería a estar adentro sin haber tipeado
     * nada. El botón parecería roto, y en una computadora compartida sería
     * bastante peor que eso.
     */
    async signOut() {
      await cerrarSesionPersistente();
    },
  },
});

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { servicioAutenticacion } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import {
  abrirSesionPersistente,
  renovarDesdeCookie,
  cerrarSesionPersistente,
} from "./sesionPersistente";
import { ID_PROVEEDOR_REFRESCO } from "./cookieRefresco";
import { CODIGO_LOGIN_BLOQUEADO, CODIGO_LOGIN_INACTIVA } from "./codigosLogin";
import { consultorioPreferido } from "./consultorioActivo";
import { ipDeSolicitud } from "./ipSolicitud";
import { identificadorLoginDto } from "@/aplicacion/dtos/autenticacion.dto";

/**
 * Configuración completa de Auth.js v5 (runtime Node).
 *
 * Añade el CredentialsProvider sobre la configuración base. La verificación
 * de las credenciales es del caso de uso `IniciarSesion`, por el servicio de
 * autenticación: acá solo se traduce su resultado a lo que espera Auth.js.
 *
 * Exporta:
 *   - handlers → para el route handler de /api/auth/[...nextauth]
 *   - auth     → para leer la sesión en el servidor (contexto tRPC, RSC)
 *   - signIn / signOut → acciones de servidor
 */
const credencialesDto = z.object({
  identificador: identificadorLoginDto,
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
        identificador: { label: "Email o usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credenciales, peticion) {
        const resultado = credencialesDto.safeParse(credenciales);
        if (!resultado.success) {
          return null;
        }

        // Las reglas del login —límite de intentos, no enumerar cuentas, la
        // baja informada recién con la contraseña verificada, el re-hasheo—
        // viven en `IniciarSesion`. Acá solo se traduce a lo que entiende
        // Auth.js: `null` para lo que no se puede distinguir, un código para
        // lo que sí. El login busca GLOBALMENTE: aún no hay inquilino.
        const intento = await ejecutarGlobal(() =>
          servicioAutenticacion().iniciarSesion({
            identificador: resultado.data.identificador,
            password: resultado.data.password,
            ip: ipDeSolicitud(peticion),
          }),
        );
        if (intento.tipo === "BLOQUEADO") {
          throw new ErrorLoginConMotivo(CODIGO_LOGIN_BLOQUEADO);
        }
        if (intento.tipo === "INACTIVA") {
          throw new ErrorLoginConMotivo(CODIGO_LOGIN_INACTIVA);
        }
        if (intento.tipo === "RECHAZADO") {
          return null;
        }
        const { usuarioId } = intento;

        // Abrir la sesión persistente: es el único momento en que se probó la
        // contraseña, así que es cuando corresponde entregar la credencial que
        // evita volver a pedirla. No puede hacer fallar el login (ver ahí).
        await abrirSesionPersistente(usuarioId, peticion);

        // El objeto devuelto alimenta el callback jwt (ver auth.config.ts).
        // Para un paciente, `pacienteId`/`nutricionistaId` son los del
        // consultorio en el que arranca: el único que tiene o, con varios,
        // NINGUNO —van en null y el portal lo manda a elegir—.
        //
        // Acá NO se lee el consultorio recordado en el dispositivo, a
        // propósito: quien se atiende en varios consultorios elige en CADA
        // login con contraseña. La cookie sigue sirviendo para la renovación
        // silenciosa (`renovarDesdeCookie`), que mantiene la elección mientras
        // usa la app y no lo saca a elegir cada 12 h.
        const identidad = await ejecutarGlobal(async () =>
          servicioAutenticacion().identidadDeSesion(usuarioId, null),
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

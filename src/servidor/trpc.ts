import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Contexto } from "./contexto";
import { ErrorDominio } from "@/dominio/errores/ErrorDominio";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";
import { MAPA_CODIGOS_TRPC } from "./mapaCodigos";

/**
 * Inicialización de tRPC con el contexto de la aplicación.
 *
 * El error formatter traduce:
 *   - ZodError      → detalle de validación legible
 *   - ErrorDominio  → código de transporte tRPC apropiado
 * Así los routers no necesitan capturar errores manualmente.
 */
const t = initTRPC.context<Contexto>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const causa = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: causa instanceof ZodError ? causa.flatten() : null,
        codigoDominio: causa instanceof ErrorDominio ? causa.codigo : null,
      },
    };
  },
});

/**
 * Middleware único de errores de los procedimientos.
 *
 * Es el ÚNICO lugar que traduce errores en toda la capa tRPC. Antes cada
 * resolver repetía un `try/catch` que llamaba a `aTRPCError` (158 bloques), y
 * eso tenía un efecto que no se veía: al relanzar un TRPCError ya construido,
 * este middleware lo daba por flujo esperado y NO lo reportaba al monitor. Los
 * errores inesperados —los bugs de verdad— nunca llegaban al monitoreo.
 *
 * OJO con la forma de leer el fallo: en tRPC v11 `next()` **no lanza** cuando
 * el resolver falla, devuelve `{ ok: false, error }`. Envolverlo en try/catch
 * compila, se lee bien y no hace nada: el catch no se ejecuta nunca. Así
 * estuvo, y el resultado era que ningún error de dominio se traducía (todos
 * salían 500), que el monitor no recibía un solo error, y que el mensaje
 * interno —incluido el host y el puerto de la base en un ECONNREFUSED— viajaba
 * tal cual al navegador. `trpc.test.ts` cubre los tres casos.
 *
 * Hace tres cosas, en este orden:
 *   1. ErrorDominio  → TRPCError con el código semántico correcto. El original
 *      queda como `cause`, que es lo que lee el errorFormatter.
 *   2. TRPCError con código propio → pasa tal cual: es flujo esperado (401/403
 *      de los procedimientos, BAD_REQUEST de la validación Zod del input).
 *   3. Cualquier otro error → se reporta al monitor y se reemplaza por un
 *      INTERNAL_SERVER_ERROR con un mensaje genérico. El mensaje explícito es
 *      la parte que sanea: sin él tRPC usa el de la `cause` y filtra el detalle
 *      interno al cliente.
 */
const traducirErroresDominio = t.middleware(async ({ next, path, ctx }) => {
  const resultado = await next();
  if (resultado.ok) return resultado;

  // Lo que se lanzó ya viene envuelto en un TRPCError; el original es `cause`.
  const error = resultado.error;
  const original = error.cause;

  if (original instanceof ErrorDominio) {
    throw new TRPCError({
      code: MAPA_CODIGOS_TRPC[original.codigo],
      message: original.message,
      cause: original,
    });
  }

  // Un código distinto de INTERNAL_SERVER_ERROR solo aparece cuando alguien lo
  // eligió: los TRPCError de los procedimientos y el BAD_REQUEST que tRPC pone
  // a la validación Zod. Eso es flujo esperado y no se toca.
  if (error.code !== "INTERNAL_SERVER_ERROR") {
    return resultado;
  }

  monitorErrores.capturar(original ?? error, {
    origen: "trpc",
    ruta: path,
    usuarioId: (ctx).usuario?.id,
  });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocurrió un error inesperado. Volvé a intentarlo en unos minutos.",
    cause: original ?? error,
  });
});

// --- Bloques de construcción ------------------------------------------------
export const crearRouter = t.router;
export const crearCallerFactory = t.createCallerFactory;

/** Procedimiento público: no requiere autenticación. */
export const publicoProcedimiento = t.procedure.use(traducirErroresDominio);

/** Procedimiento protegido: requiere cualquier usuario autenticado. */
export const protegidoProcedimiento = publicoProcedimiento.use(
  ({ ctx, next }) => {
    if (!ctx.usuario) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Necesitás iniciar sesión.",
      });
    }
    return next({
      // A partir de acá, ctx.usuario está garantizado (no nulo).
      ctx: { usuario: ctx.usuario, rol: ctx.usuario.rol },
    });
  },
);

/** Procedimiento de nutricionista: requiere sesión Y rol NUTRICIONISTA. */
export const nutricionistaProcedimiento = protegidoProcedimiento.use(
  ({ ctx, next }) => {
    if (ctx.usuario.rol !== "NUTRICIONISTA") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Esta acción es exclusiva del nutricionista.",
      });
    }
    return next();
  },
);

/** Procedimiento de superadministrador: gestiona todas las cuentas (global). */
export const superadminProcedimiento = protegidoProcedimiento.use(
  ({ ctx, next }) => {
    if (ctx.usuario.rol !== "SUPERADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Esta acción es exclusiva del superadministrador.",
      });
    }
    return next();
  },
);

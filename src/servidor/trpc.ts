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
 * Hace tres cosas, en este orden:
 *   1. ErrorDominio  → TRPCError con el código semántico correcto. El original
 *      queda como `cause`, que es lo que lee el errorFormatter.
 *   2. TRPCError     → pasa tal cual: es flujo esperado (401/403 de los
 *      procedimientos, BAD_REQUEST de la validación Zod del input).
 *   3. Cualquier otro error → se reporta al monitor y se reemplaza por un
 *      INTERNAL_SERVER_ERROR sin mensaje. Este saneo es lo que antes hacía
 *      `aTRPCError`: sin él, tRPC usaría el mensaje del error original como
 *      mensaje de la respuesta y filtraría detalles internos al cliente.
 */
const traducirErroresDominio = t.middleware(async ({ next, path, ctx }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ErrorDominio) {
      throw new TRPCError({
        code: MAPA_CODIGOS_TRPC[error.codigo],
        message: error.message,
        cause: error,
      });
    }
    if (error instanceof TRPCError) {
      throw error;
    }

    monitorErrores.capturar(error, {
      origen: "trpc",
      ruta: path,
      usuarioId: (ctx as Contexto).usuario?.id,
    });
    // Sin `message`: no se filtra al cliente el detalle de lo que salió mal.
    // El error real viaja en `cause` para los logs del servidor.
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
  }
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

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Contexto } from "./contexto";
import { ErrorDominio, type CodigoErrorDominio } from "@/dominio/errores/ErrorDominio";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";

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

/** Mapea los códigos semánticos del dominio a códigos de error de tRPC. */
const MAPA_CODIGOS: Record<CodigoErrorDominio, TRPCError["code"]> = {
  VALIDACION: "BAD_REQUEST",
  NO_ENCONTRADO: "NOT_FOUND",
  CONFLICTO: "CONFLICT",
  ACCESO_DENEGADO: "FORBIDDEN",
  NO_AUTENTICADO: "UNAUTHORIZED",
};

/**
 * Middleware que convierte cualquier ErrorDominio lanzado por los servicios
 * en un TRPCError con el código correcto, preservando el error original
 * como `cause` (lo usa el errorFormatter).
 */
const traducirErroresDominio = t.middleware(async ({ next, path, ctx }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ErrorDominio) {
      throw new TRPCError({
        code: MAPA_CODIGOS[error.codigo],
        message: error.message,
        cause: error,
      });
    }
    // Error NO esperado (ni de dominio ni un TRPCError de control como 401/403):
    // se reporta al monitor. Los TRPCError explícitos son flujo esperado.
    if (!(error instanceof TRPCError)) {
      monitorErrores.capturar(error, {
        origen: "trpc",
        ruta: path,
        usuarioId: (ctx as Contexto).usuario?.id,
      });
    }
    throw error;
  }
});

// --- Bloques de construcción ------------------------------------------------
export const crearRouter = t.router;
export const crearCallerFactory = t.createCallerFactory;

/** Procedimiento público: no requiere autenticación. */
export const publicoProcedimiento = t.procedure.use(traducirErroresDominio);

/** Procedimiento protegido: requiere cualquier usuario autenticado. */
export const protegidoProcedimiento = publicoProcedimiento.use(({ ctx, next }) => {
  if (!ctx.usuario) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Necesitás iniciar sesión." });
  }
  return next({
    // A partir de acá, ctx.usuario está garantizado (no nulo).
    ctx: { usuario: ctx.usuario, rol: ctx.usuario.rol },
  });
});

/** Procedimiento de nutricionista: requiere sesión Y rol NUTRICIONISTA. */
export const nutricionistaProcedimiento = protegidoProcedimiento.use(({ ctx, next }) => {
  if (ctx.usuario.rol !== "NUTRICIONISTA") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta acción es exclusiva del nutricionista.",
    });
  }
  return next();
});

/** Procedimiento de superadministrador: gestiona todas las cuentas (global). */
export const superadminProcedimiento = protegidoProcedimiento.use(({ ctx, next }) => {
  if (ctx.usuario.rol !== "SUPERADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta acción es exclusiva del superadministrador.",
    });
  }
  return next();
});

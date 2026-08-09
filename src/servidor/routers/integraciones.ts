import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";

/**
 * Router de Integraciones (solo NUTRICIONISTA): estado de la conexión con
 * Google y desconexión. La CONEXIÓN se hace por route handler OAuth
 * (/api/integraciones/google/conectar), no por tRPC.
 */
export const routerIntegraciones = crearRouter({
  estado: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.integraciones.estado();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  desconectarGoogle: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    try {
      await ctx.servicios.integraciones.desconectarGoogle();
      return { ok: true };
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

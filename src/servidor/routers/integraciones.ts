import { crearRouter, nutricionistaProcedimiento } from "../trpc";

/**
 * Router de Integraciones (solo NUTRICIONISTA): estado de la conexión con
 * Google y desconexión. La CONEXIÓN se hace por route handler OAuth
 * (/api/integraciones/google/conectar), no por tRPC.
 */
export const routerIntegraciones = crearRouter({
  estado: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.integraciones.estado();
  }),

  desconectarGoogle: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    await ctx.servicios.integraciones.desconectarGoogle();
    return { ok: true };
  }),
});

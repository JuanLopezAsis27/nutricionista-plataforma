import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";

/**
 * Router del Centro de Notificaciones (solo NUTRICIONISTA): feed unificado de
 * lo que le importa al profesional —alertas de seguimiento, mensajes de
 * pacientes sin leer y avisos de correo— con su contador para la campana.
 * El `viewerId` se toma de la sesión, nunca del input.
 */
export const routerNotificaciones = crearRouter({
  centro: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.notificaciones.obtenerCentro(ctx.usuario.id);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { marcarNotificacionVistaDto } from "@/aplicacion/dtos/notificaciones.dto";

/**
 * Router del Centro de Notificaciones (solo NUTRICIONISTA): feed unificado de
 * lo que le importa al profesional —alertas de seguimiento, mensajes de
 * pacientes sin leer, avisos de correo y las notificaciones persistidas de
 * WhatsApp entrante y turnos confirmados— con su contador para la campana.
 * El `viewerId` se toma de la sesión, nunca del input.
 */
export const routerNotificaciones = crearRouter({
  centro: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.notificaciones.obtenerCentro();
  }),

  /**
   * Marca una notificación como vista, o todas si no se manda id.
   *
   * No recibe `nutricionistaId`: el alcance de inquilino ya acota la escritura
   * al consultorio de la sesión, así que un id de otro consultorio no actualiza
   * nada (ver `PrismaRepositorioNotificacion.marcarVista`).
   */
  marcarVista: nutricionistaProcedimiento
    .input(marcarNotificacionVistaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.notificaciones.marcarVista(input);
    }),
});

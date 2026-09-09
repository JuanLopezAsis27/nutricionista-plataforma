import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  registrarGrabacionDto,
  idGrabacionDto,
  turnoGrabadoDto,
} from "@/aplicacion/dtos/grabacion.dto";

/**
 * Router de las grabaciones de consulta.
 *
 * Todo es del NUTRICIONISTA y no hay procedimiento protegido para el paciente:
 * la grabación de una consulta y su transcripción son material clínico del
 * profesional, como la historia clínica y los laboratorios. Lo que el paciente
 * ve de su evaluación está enumerado en `AGENTS.md` y esto no está ahí.
 *
 * El AUDIO no viaja por acá: se sube por `/api/archivos` (multipart, contexto
 * `grabacion`) y se escucha por `/api/archivos/<id>/ver`, con la misma
 * autorización que el resto de los archivos del bucket.
 */
export const routerGrabaciones = crearRouter({
  /** Grabaciones de un turno + el resumen de la consulta. */
  obtenerDeTurno: nutricionistaProcedimiento
    .input(turnoGrabadoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.grabaciones.obtenerDeTurno(input.turnoId);
    }),

  /** Registra un audio ya subido y lo manda a transcribir en segundo plano. */
  registrar: nutricionistaProcedimiento
    .input(registrarGrabacionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.grabaciones.registrar(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idGrabacionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.grabaciones.eliminar(input.id);
      return { eliminada: true };
    }),

  /** Vuelve a encolar una transcripción que quedó fallida. */
  reintentar: nutricionistaProcedimiento
    .input(idGrabacionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.grabaciones.reintentar(input.id);
    }),

  /**
   * Regenera el resumen a pedido.
   *
   * Corre EN LA REQUEST y no en la cola, al revés que la transcripción: resumir
   * un texto ya transcrito son segundos, y el profesional que apretó el botón
   * está esperando el resultado en pantalla.
   */
  regenerarResumen: nutricionistaProcedimiento
    .input(turnoGrabadoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.grabaciones.regenerarResumen(input.turnoId);
    }),
});

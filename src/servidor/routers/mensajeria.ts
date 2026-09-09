import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  enviarMensajeNutriDto,
  enviarMiMensajeDto,
  pacienteObjetivoDto,
} from "@/aplicacion/dtos/mensajeria.dto";

/**
 * Router de Mensajería. El nutricionista opera por `pacienteId`; el paciente
 * siempre sobre SU conversación (pacienteId tomado de la sesión, nunca del
 * input) — así no puede leer ni escribir en conversaciones ajenas.
 */
export const routerMensajeria = crearRouter({
  // --- Nutricionista -------------------------------------------------------
  conversaciones: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.mensajeria.listarConversaciones(ctx.usuario.id);
  }),

  noLeidos: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.mensajeria.contarNoLeidos(ctx.usuario.id);
  }),

  hiloDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.mensajeria.abrirHilo(input.pacienteId);
    }),

  enviarA: nutricionistaProcedimiento
    .input(enviarMensajeNutriDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.mensajeria.enviar({
        autorId: ctx.usuario.id,
        autorEsNutricionista: true,
        pacienteId: input.pacienteId,
        cuerpo: input.cuerpo,
      });
    }),

  marcarLeidosDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.mensajeria.marcarLeidos(
        input.pacienteId,
        ctx.usuario.id,
      );
      return { ok: true };
    }),

  // --- Portal del paciente -------------------------------------------------
  miHilo: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.mensajeria.abrirHilo(
      pacienteDeSesion(ctx.usuario),
    );
  }),

  misNoLeidos: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.mensajeria.contarNoLeidos(
      ctx.usuario.id,
      pacienteDeSesion(ctx.usuario),
    );
  }),

  enviar: protegidoProcedimiento
    .input(enviarMiMensajeDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.mensajeria.enviar({
        autorId: ctx.usuario.id,
        autorEsNutricionista: false,
        pacienteId: pacienteDeSesion(ctx.usuario),
        cuerpo: input.cuerpo,
      });
    }),

  marcarMisLeidos: protegidoProcedimiento.mutation(async ({ ctx }) => {
    await ctx.servicios.mensajeria.marcarLeidos(
      pacienteDeSesion(ctx.usuario),
      ctx.usuario.id,
    );
    return { ok: true };
  }),
});

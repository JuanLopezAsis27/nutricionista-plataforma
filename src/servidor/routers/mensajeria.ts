import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  enviarMensajeNutriDto,
  enviarMiMensajeDto,
  pacienteObjetivoDto,
} from "@/aplicacion/dtos/mensajeria.dto";

/** Devuelve el pacienteId de la sesión o lanza si el usuario no es paciente. */
function pacienteDeSesion(pacienteId: string | null): string {
  if (!pacienteId) {
    throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
  }
  return pacienteId;
}

/**
 * Router de Mensajería. El nutricionista opera por `pacienteId`; el paciente
 * siempre sobre SU conversación (pacienteId tomado de la sesión, nunca del
 * input) — así no puede leer ni escribir en conversaciones ajenas.
 */
export const routerMensajeria = crearRouter({
  // --- Nutricionista -------------------------------------------------------
  conversaciones: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.mensajeria.listarConversaciones(ctx.usuario.id);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  noLeidos: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.mensajeria.contarNoLeidos(ctx.usuario.id);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  hiloDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.mensajeria.abrirHilo(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  enviarA: nutricionistaProcedimiento
    .input(enviarMensajeNutriDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.mensajeria.enviar({
          autorId: ctx.usuario.id,
          autorEsNutricionista: true,
          pacienteId: input.pacienteId,
          cuerpo: input.cuerpo,
        });
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  marcarLeidosDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.mensajeria.marcarLeidos(input.pacienteId, ctx.usuario.id);
        return { ok: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Portal del paciente -------------------------------------------------
  miHilo: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.mensajeria.abrirHilo(pacienteDeSesion(ctx.usuario.pacienteId));
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  misNoLeidos: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.mensajeria.contarNoLeidos(
        ctx.usuario.id,
        pacienteDeSesion(ctx.usuario.pacienteId),
      );
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  enviar: protegidoProcedimiento
    .input(enviarMiMensajeDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.mensajeria.enviar({
          autorId: ctx.usuario.id,
          autorEsNutricionista: false,
          pacienteId: pacienteDeSesion(ctx.usuario.pacienteId),
          cuerpo: input.cuerpo,
        });
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  marcarMisLeidos: protegidoProcedimiento.mutation(async ({ ctx }) => {
    try {
      await ctx.servicios.mensajeria.marcarLeidos(
        pacienteDeSesion(ctx.usuario.pacienteId),
        ctx.usuario.id,
      );
      return { ok: true };
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

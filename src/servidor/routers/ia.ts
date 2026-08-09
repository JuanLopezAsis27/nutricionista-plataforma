import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { preguntarDto, analizarComidaDto, feedbackInsightDto } from "@/aplicacion/dtos/ia.dto";

function pacienteDeSesion(pacienteId: string | null): string {
  if (!pacienteId) {
    throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
  }
  return pacienteId;
}

/**
 * Router de IA (andamiaje). Portal del paciente: asistente + análisis de foto
 * (pacienteId de la sesión). Nutricionista: insights predictivos.
 */
export const routerIA = crearRouter({
  // --- Portal del paciente -------------------------------------------------
  preguntar: protegidoProcedimiento
    .input(preguntarDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.ia.preguntar(
          pacienteDeSesion(ctx.usuario.pacienteId),
          input.pregunta,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  analizarFoto: protegidoProcedimiento
    .input(analizarComidaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.ia.analizarFoto(pacienteDeSesion(ctx.usuario.pacienteId), {
          archivoId: input.archivoId,
          descripcion: input.descripcion,
        });
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  misConsultas: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.ia.misConsultas(pacienteDeSesion(ctx.usuario.pacienteId));
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  // Si la IA está activa (clave/servicio configurados) para ocultar los banners
  // de "demostración". Cualquier usuario autenticado (el paciente usa la del nutri).
  estado: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.ia.estado();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  // --- Nutricionista -------------------------------------------------------
  insights: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.ia.insights();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  // Asistente analítico del nutri: chat con herramientas sobre la base.
  analizar: nutricionistaProcedimiento
    .input(preguntarDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.ia.analizar(input.pregunta);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Loop de feedback: el nutri corrige un insight (👍/👎) → etiqueta para el ML.
  feedbackInsight: nutricionistaProcedimiento
    .input(feedbackInsightDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.ia.registrarFeedback(input);
        return { ok: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

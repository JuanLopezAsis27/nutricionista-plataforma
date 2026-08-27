import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import { preguntarDto, analizarComidaDto, feedbackInsightDto } from "@/aplicacion/dtos/ia.dto";

/**
 * Router de IA (andamiaje). Portal del paciente: asistente + análisis de foto
 * (pacienteId de la sesión). Nutricionista: insights predictivos.
 */
export const routerIA = crearRouter({
  // --- Portal del paciente -------------------------------------------------
  preguntar: protegidoProcedimiento
    .input(preguntarDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.ia.preguntar(
        pacienteDeSesion(ctx.usuario),
        input.pregunta,
      );
    }),

  analizarFoto: protegidoProcedimiento
    .input(analizarComidaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.ia.analizarFoto(pacienteDeSesion(ctx.usuario), {
        archivoId: input.archivoId,
        descripcion: input.descripcion,
      });
    }),

  misConsultas: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.misConsultas(pacienteDeSesion(ctx.usuario));
  }),

  // Si la IA está activa (clave/servicio configurados) para ocultar los banners
  // de "demostración". Cualquier usuario autenticado (el paciente usa la del nutri).
  estado: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.estado();
  }),

  // --- Nutricionista -------------------------------------------------------
  insights: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.ia.insights();
  }),

  // Asistente analítico del nutri: chat con herramientas sobre la base.
  analizar: nutricionistaProcedimiento
    .input(preguntarDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.ia.analizar(input.pregunta);
    }),

  // Loop de feedback: el nutri corrige un insight (👍/👎) → etiqueta para el ML.
  feedbackInsight: nutricionistaProcedimiento
    .input(feedbackInsightDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.ia.registrarFeedback(input);
      return { ok: true };
    }),
});

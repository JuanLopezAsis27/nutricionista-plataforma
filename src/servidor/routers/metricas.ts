import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  importarMetricasDto,
  rangoMetricasDto,
  rangoMetricasDePacienteDto,
  fijarInclusionDto,
} from "@/aplicacion/dtos/metricas.dto";

/**
 * Router de métricas de dispositivo (wearables).
 *
 * Portal: el paciente importa los datos de su reloj, los consulta y decide
 * por día si cuentan para su seguimiento (pacienteId de la sesión). El
 * nutricionista solo los ve.
 */
export const routerMetricas = crearRouter({
  importar: protegidoProcedimiento
    .input(importarMetricasDto)
    .mutation(async ({ ctx, input }) => {
      const importadas = await ctx.servicios.metricas.importar(
        pacienteDeSesion(ctx.usuario),
        input,
      );
      return { importadas };
    }),

  mias: protegidoProcedimiento
    .input(rangoMetricasDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.metricas.listar(
        pacienteDeSesion(ctx.usuario),
        input.desde,
        input.hasta,
      );
    }),

  fijarInclusion: protegidoProcedimiento
    .input(fijarInclusionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.metricas.fijarInclusion(
        pacienteDeSesion(ctx.usuario),
        input.fecha,
        input.incluir,
      );
      return { ok: true };
    }),

  // Vista del nutricionista (solo lectura; el inquilino acota al paciente).
  dePaciente: nutricionistaProcedimiento
    .input(rangoMetricasDePacienteDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.metricas.listar(
        input.pacienteId,
        input.desde,
        input.hasta,
      );
    }),
});

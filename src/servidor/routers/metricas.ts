import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
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
      try {
        if (!ctx.usuario.pacienteId) {
          throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
        }
        const importadas = await ctx.servicios.metricas.importar(ctx.usuario.pacienteId, input);
        return { importadas };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  mias: protegidoProcedimiento.input(rangoMetricasDto).query(async ({ ctx, input }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.metricas.listar(ctx.usuario.pacienteId, input.desde, input.hasta);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  fijarInclusion: protegidoProcedimiento
    .input(fijarInclusionDto)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.usuario.pacienteId) {
          throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
        }
        await ctx.servicios.metricas.fijarInclusion(
          ctx.usuario.pacienteId,
          input.fecha,
          input.incluir,
        );
        return { ok: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Vista del nutricionista (solo lectura; el inquilino acota al paciente).
  dePaciente: nutricionistaProcedimiento
    .input(rangoMetricasDePacienteDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.metricas.listar(input.pacienteId, input.desde, input.hasta);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

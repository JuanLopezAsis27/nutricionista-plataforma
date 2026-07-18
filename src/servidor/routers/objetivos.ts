import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  crearObjetivoDto,
  actualizarObjetivoDto,
  cambiarEstadoObjetivoDto,
  idObjetivoDto,
  agregarEstrategiaDto,
  cambiarEstadoEstrategiaDto,
  eliminarEstrategiaDto,
} from "@/aplicacion/dtos/objetivo.dto";

/**
 * Router de Objetivos (presentación → aplicación).
 * Gestión exclusiva del NUTRICIONISTA (el paciente los verá en F7 vía su
 * portal consolidado, en modo lectura).
 */
export const routerObjetivos = crearRouter({
  obtenerDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.objetivo.obtenerObjetivosDePaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.objetivo.crearObjetivo(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.objetivo.actualizarObjetivo(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  cambiarEstado: nutricionistaProcedimiento
    .input(cambiarEstadoObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.objetivo.cambiarEstadoObjetivo(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.objetivo.eliminarObjetivo(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  agregarEstrategia: nutricionistaProcedimiento
    .input(agregarEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.objetivo.agregarEstrategia(input);
        return { agregada: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  cambiarEstadoEstrategia: nutricionistaProcedimiento
    .input(cambiarEstadoEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.objetivo.cambiarEstadoEstrategia(input);
        return { cambiada: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarEstrategia: nutricionistaProcedimiento
    .input(eliminarEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.objetivo.eliminarEstrategia(input);
        return { eliminada: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  historial: nutricionistaProcedimiento
    .input(idObjetivoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.objetivo.obtenerHistorial(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

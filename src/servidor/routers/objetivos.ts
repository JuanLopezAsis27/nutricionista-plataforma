import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
      return await ctx.servicios.objetivo.obtenerObjetivosDePaciente(
        input.pacienteId,
      );
    }),

  // Portal: el paciente ve sus objetivos en modo lectura (pacienteId de sesión).
  mios: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.objetivo.obtenerObjetivosDePaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),

  crear: nutricionistaProcedimiento
    .input(crearObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.objetivo.crearObjetivo(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.objetivo.actualizarObjetivo(input);
    }),

  cambiarEstado: nutricionistaProcedimiento
    .input(cambiarEstadoObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.objetivo.cambiarEstadoObjetivo(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idObjetivoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.objetivo.eliminarObjetivo(input.id);
      return { eliminado: true };
    }),

  agregarEstrategia: nutricionistaProcedimiento
    .input(agregarEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.objetivo.agregarEstrategia(input);
      return { agregada: true };
    }),

  cambiarEstadoEstrategia: nutricionistaProcedimiento
    .input(cambiarEstadoEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.objetivo.cambiarEstadoEstrategia(input);
      return { cambiada: true };
    }),

  eliminarEstrategia: nutricionistaProcedimiento
    .input(eliminarEstrategiaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.objetivo.eliminarEstrategia(input);
      return { eliminada: true };
    }),

  historial: nutricionistaProcedimiento
    .input(idObjetivoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.objetivo.obtenerHistorial(input.id);
    }),
});

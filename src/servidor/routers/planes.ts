import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  crearPlanDto,
  actualizarPlanDto,
  idPlanDto,
  filtroPlanesDto,
  listarPlanesPaginadoDto,
  archivarPlanDto,
  crearDesdePlantillaDto,
  asignarPlanDto,
} from "@/aplicacion/dtos/plan.dto";

/**
 * Router de Planes Nutricionales (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo ve su plan activo
 * (obtenerMiPlan, con pacienteId tomado de la sesión).
 */
export const routerPlanes = crearRouter({
  // Lista completa (sin paginar): para selectores.
  obtenerTodos: nutricionistaProcedimiento
    .input(filtroPlanesDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.obtenerPlanes(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Listado paginado (10/página, server-side) para la página de planes.
  listarPaginado: nutricionistaProcedimiento
    .input(listarPlanesPaginadoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.obtenerPlanesPaginado(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idPlanDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.obtenerPlanPorId(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearPlanDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.crearPlan(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPlanDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.actualizarPlan(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPlanDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.plan.eliminarPlan(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  archivar: nutricionistaProcedimiento
    .input(archivarPlanDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.plan.archivarPlan(input);
        return { archivado: input.archivado };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crearDesdePlantilla: nutricionistaProcedimiento
    .input(crearDesdePlantillaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.crearPlanDesdePlantilla(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarPlanDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.asignarPlanAPaciente(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.plan.desasignarPlanDePaciente(input.pacienteId);
        return { desasignado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // El nutricionista consulta el plan activo de un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.plan.obtenerPlanDelPaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Portal: el paciente ve su plan activo (pacienteId de la sesión).
  obtenerMiPlan: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.plan.obtenerPlanDelPaciente(ctx.usuario.pacienteId);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

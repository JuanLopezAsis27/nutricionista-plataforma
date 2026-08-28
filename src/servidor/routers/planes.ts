import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
      return await ctx.servicios.plan.obtenerPlanes(input);
    }),

  // Listado paginado (10/página, server-side) para la página de planes.
  listarPaginado: nutricionistaProcedimiento
    .input(listarPlanesPaginadoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.plan.obtenerPlanesPaginado(input);
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idPlanDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.plan.obtenerPlanPorId(input.id);
    }),

  crear: nutricionistaProcedimiento
    .input(crearPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.crearPlan(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.actualizarPlan(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.eliminarPlan(input.id);
      return { eliminado: true };
    }),

  archivar: nutricionistaProcedimiento
    .input(archivarPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.archivarPlan(input);
      return { archivado: input.archivado };
    }),

  crearDesdePlantilla: nutricionistaProcedimiento
    .input(crearDesdePlantillaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.crearPlanDesdePlantilla(input);
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.asignarPlanAPaciente(input);
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.desasignarPlanDePaciente(input.pacienteId);
      return { desasignado: true };
    }),

  // El nutricionista consulta el plan activo de un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.plan.obtenerPlanDelPaciente(input.pacienteId);
    }),

  // Portal: el paciente ve su plan activo (pacienteId de la sesión).
  obtenerMiPlan: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.plan.obtenerPlanDelPaciente(pacienteDeSesion(ctx.usuario));
  }),
});

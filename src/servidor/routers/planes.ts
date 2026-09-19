import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
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
  desasignarPlanDto,
  asignarPlanMultipleDto,
  crearPlanParaPacienteDto,
  grupoPlanDto,
  actualizarGrupoPlanDto,
  idGrupoPlanDto,
  moverPlanDto,
} from "@/aplicacion/dtos/plan.dto";

/**
 * Router de Planes Nutricionales (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo ve los planes que tiene
 * asignados (obtenerMisPlanes, con pacienteId tomado de la sesión).
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

  /** El mismo plan a varios pacientes. Uno que falle no aborta a los demás. */
  asignarAVarios: nutricionistaProcedimiento
    .input(asignarPlanMultipleDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.asignarPlanAVarios(input);
    }),

  /** Crea un plan nuevo YA asignado a un paciente, desde su ficha. */
  crearParaPaciente: nutricionistaProcedimiento
    .input(crearPlanParaPacienteDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.crearPlanParaPaciente(input);
    }),

  /** Le saca UN plan al paciente: los otros que tenga siguen asignados. */
  desasignarDePaciente: nutricionistaProcedimiento
    .input(desasignarPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.desasignarPlanDePaciente(input);
      return { desasignado: true };
    }),

  // El nutricionista consulta los planes de un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.plan.obtenerPlanesDelPaciente(
        input.pacienteId,
      );
    }),

  /** Pacientes que tienen este plan asignado. */
  obtenerPacientesDePlan: nutricionistaProcedimiento
    .input(idPlanDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.plan.obtenerPacientesDePlan(input.id);
    }),

  /** Mueve un plan a una carpeta. Toca SOLO la carpeta, no el contenido. */
  moverAGrupo: nutricionistaProcedimiento
    .input(moverPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.moverPlanAGrupo(input);
      return { movido: true };
    }),

  // --- Carpetas -------------------------------------------------------------

  obtenerGrupos: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.plan.obtenerGrupos();
  }),

  crearGrupo: nutricionistaProcedimiento
    .input(grupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.crearGrupo(input);
    }),

  actualizarGrupo: nutricionistaProcedimiento
    .input(actualizarGrupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.plan.actualizarGrupo(input);
    }),

  eliminarGrupo: nutricionistaProcedimiento
    .input(idGrupoPlanDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.plan.eliminarGrupo(input.id);
      return { eliminado: true };
    }),

  // Portal: el paciente ve sus planes asignados (pacienteId de la sesión).
  obtenerMisPlanes: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.plan.obtenerPlanesDelPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),
});

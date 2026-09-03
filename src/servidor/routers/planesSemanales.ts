import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  crearPlanSemanalDto,
  actualizarPlanSemanalDto,
  idPlanSemanalDto,
  listarPlanesSemanalesDto,
  asignarPlanSemanalDto,
} from "@/aplicacion/dtos/planSemanal.dto";

/**
 * Router de Planes Semanales de referencia (presentación → aplicación).
 *
 * Es una sección más del módulo de planes, pero un router aparte: los planes
 * semanales son otro agregado, con su propio historial de asignaciones, y
 * meterlos en `routerPlanes` haría que la mitad de sus procedimientos hablaran
 * de otra cosa.
 *
 * Todo es del NUTRICIONISTA: el menú de la semana se arma y se asigna desde el
 * consultorio.
 */
export const routerPlanesSemanales = crearRouter({
  listar: nutricionistaProcedimiento
    .input(listarPlanesSemanalesDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.obtenerPlanesSemanales(input);
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idPlanSemanalDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.obtenerPlanSemanalPorId(input.id);
    }),

  crear: nutricionistaProcedimiento
    .input(crearPlanSemanalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.crearPlanSemanal(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPlanSemanalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.actualizarPlanSemanal(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPlanSemanalDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planSemanal.eliminarPlanSemanal(input.id);
      return { eliminado: true };
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarPlanSemanalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.asignarPlanSemanalAPaciente(input);
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.planSemanal.desasignarPlanSemanalDePaciente(
        input.pacienteId,
      );
      return { desasignado: true };
    }),

  /** El menú vigente del paciente, ya comparado contra las metas de su plan. */
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.obtenerPlanSemanalDelPaciente(
        input.pacienteId,
      );
    }),

  obtenerHistorialDePaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.obtenerHistorialDePaciente(
        input.pacienteId,
      );
    }),

  /** Pacientes que tienen o tuvieron este plan semanal. */
  obtenerPacientesDePlan: nutricionistaProcedimiento
    .input(idPlanSemanalDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.planSemanal.obtenerPacientesDePlanSemanal(
        input.id,
      );
    }),
});

import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
 * La gestión es del NUTRICIONISTA: el menú de la semana se arma y se asigna
 * desde el consultorio. El paciente solo lee el suyo (`obtenerMiPlanSemanal`,
 * con el pacienteId tomado de la sesión).
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

  /**
   * Portal: el paciente ve SU menú vigente (pacienteId de la sesión).
   *
   * Devuelve lo mismo que `obtenerDelPaciente` —el menú más la comparación
   * contra las metas de su plan nutricional—: es la misma lectura, y lo único
   * que cambia es de dónde sale el paciente. Va aparte y no con un pacienteId
   * opcional porque acá no hay nada que elegir, que es justo lo que evita que
   * un paciente pida el menú de otro.
   */
  obtenerMiPlanSemanal: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.planSemanal.obtenerPlanSemanalDelPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),
});

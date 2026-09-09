import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteConsultable } from "@/dominio/servicios/politicaAcceso";
import {
  agendarTurnoDto,
  listarTurnosDto,
  actualizarEstadoTurnoDto,
  cancelarTurnoDto,
  reprogramarTurnoDto,
  registrarCobroTurnoDto,
} from "@/aplicacion/dtos/turno.dto";

/**
 * Router de Turnos (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo puede ver sus propios
 * turnos (obtenerPorPaciente, con procedimiento protegido).
 */
export const routerTurnos = crearRouter({
  obtenerTodos: nutricionistaProcedimiento
    .input(listarTurnosDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.turno.obtenerTurnos(input);
    }),

  obtenerPorPaciente: protegidoProcedimiento
    .input(z.object({ pacienteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // El nutricionista consulta cualquier paciente; el paciente, solo el suyo.
      const objetivo = pacienteConsultable(
        ctx.usuario,
        input.pacienteId,
        "turnos",
      );
      return await ctx.servicios.turno.obtenerTurnosPorPaciente(objetivo);
    }),

  agendar: nutricionistaProcedimiento
    .input(agendarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.agendarTurno(input);
    }),

  actualizarEstado: nutricionistaProcedimiento
    .input(actualizarEstadoTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.actualizarEstadoTurno(input);
    }),

  cancelar: nutricionistaProcedimiento
    .input(cancelarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.cancelarTurno(input.id);
    }),

  /**
   * Borra un turno cancelado. Distinto de `cancelar`, que es baja lógica: esto
   * lo saca de la agenda para siempre y solo aplica a cancelados sin cobro.
   */
  eliminar: nutricionistaProcedimiento
    .input(cancelarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.turno.eliminarTurno(input.id);
      return { eliminado: true };
    }),

  reprogramar: nutricionistaProcedimiento
    .input(reprogramarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.reprogramarTurno(input);
    }),

  registrarCobro: nutricionistaProcedimiento
    .input(registrarCobroTurnoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.turno.registrarCobroTurno(input);
    }),
});

import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
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
      try {
        return await ctx.servicios.turno.obtenerTurnos(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  obtenerPorPaciente: protegidoProcedimiento
    .input(z.object({ pacienteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        // El nutricionista consulta cualquier paciente; el paciente, solo el suyo.
        const objetivo =
          ctx.usuario.rol === "NUTRICIONISTA" ? input.pacienteId : ctx.usuario.pacienteId;
        if (!objetivo) {
          throw new ErrorAccesoDenegado("No se indicó un paciente válido.");
        }
        if (ctx.usuario.rol !== "NUTRICIONISTA" && input.pacienteId && input.pacienteId !== objetivo) {
          throw new ErrorAccesoDenegado("Solo podés ver tus propios turnos.");
        }
        return await ctx.servicios.turno.obtenerTurnosPorPaciente(objetivo);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  agendar: nutricionistaProcedimiento
    .input(agendarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.turno.agendarTurno(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarEstado: nutricionistaProcedimiento
    .input(actualizarEstadoTurnoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.turno.actualizarEstadoTurno(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  cancelar: nutricionistaProcedimiento
    .input(cancelarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.turno.cancelarTurno(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  reprogramar: nutricionistaProcedimiento
    .input(reprogramarTurnoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.turno.reprogramarTurno(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  registrarCobro: nutricionistaProcedimiento
    .input(registrarCobroTurnoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.turno.registrarCobroTurno(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

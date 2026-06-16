import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  crearDietaDto,
  actualizarDietaDto,
  asignarDietaDto,
  idDietaDto,
} from "@/aplicacion/dtos/dieta.dto";

/**
 * Router de Dietas (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo puede ver su propia dieta
 * activa (obtenerMiDieta, con procedimiento protegido).
 */
export const routerDietas = crearRouter({
  obtenerTodas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.dieta.obtenerDietas();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idDietaDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.dieta.obtenerDietaPorId(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearDietaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.dieta.crearDieta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarDietaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.dieta.actualizarDieta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idDietaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.dieta.eliminarDieta(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarDietaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.dieta.asignarDietaAPaciente(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // El nutricionista consulta la dieta activa de un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.dieta.obtenerDietaDelPaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  obtenerMiDieta: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.dieta.obtenerDietaDelPaciente(ctx.usuario.pacienteId);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

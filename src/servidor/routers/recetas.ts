import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  crearRecetaDto,
  actualizarRecetaDto,
  idRecetaDto,
  filtroRecetasDto,
  asignarRecetaDto,
} from "@/aplicacion/dtos/receta.dto";

/**
 * Router del Recetario (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo ve las recetas que le
 * fueron compartidas (obtenerMisRecetas, con pacienteId tomado de la sesión).
 */
export const routerRecetas = crearRouter({
  obtenerTodas: nutricionistaProcedimiento
    .input(filtroRecetasDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.obtenerRecetas(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idRecetaDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.obtenerRecetaPorId(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearRecetaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.crearReceta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.actualizarReceta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idRecetaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.receta.eliminarReceta(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.receta.asignarRecetaAPaciente(input);
        return { asignado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(asignarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.receta.desasignarRecetaDePaciente(input);
        return { desasignado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Ids de los pacientes con los que se compartió una receta (para el diálogo
  // de asignación del nutricionista).
  pacientesAsignados: nutricionistaProcedimiento
    .input(idRecetaDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.obtenerPacientesDeReceta(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Recetas compartidas con un paciente concreto (vista del nutricionista).
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.receta.obtenerRecetasDelPaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Portal: el paciente ve sus recetas (pacienteId de la sesión).
  obtenerMisRecetas: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.receta.obtenerRecetasDelPaciente(ctx.usuario.pacienteId);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

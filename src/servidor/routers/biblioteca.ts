import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  crearMaterialDto,
  actualizarMaterialDto,
  idMaterialDto,
  filtroMaterialesDto,
  listarMaterialesPaginadoDto,
  asignarMaterialDto,
} from "@/aplicacion/dtos/material.dto";

/**
 * Router de la Biblioteca (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo ve el material que le
 * fue compartido (obtenerMiMaterial, con pacienteId tomado de la sesión).
 */
export const routerBiblioteca = crearRouter({
  // Lista completa (sin paginar): para selectores.
  obtenerTodos: nutricionistaProcedimiento
    .input(filtroMaterialesDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.obtenerMateriales(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Listado paginado (10/página, server-side) para la página de la biblioteca.
  listarPaginado: nutricionistaProcedimiento
    .input(listarMaterialesPaginadoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.obtenerMaterialesPaginado(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearMaterialDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.crearMaterial(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.actualizarMaterial(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idMaterialDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.biblioteca.eliminarMaterial(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.biblioteca.asignarMaterialAPaciente(input);
        return { asignado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(asignarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.biblioteca.desasignarMaterialDePaciente(input);
        return { desasignado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  pacientesAsignados: nutricionistaProcedimiento
    .input(idMaterialDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.obtenerPacientesDeMaterial(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // El nutricionista consulta el material compartido con un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.biblioteca.obtenerMaterialesDelPaciente(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Portal: el paciente ve su material (pacienteId de la sesión).
  obtenerMiMaterial: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.biblioteca.obtenerMaterialesDelPaciente(
        ctx.usuario.pacienteId,
      );
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  crearMaterialDto,
  actualizarMaterialDto,
  idMaterialDto,
  filtroMaterialesDto,
  listarMaterialesPaginadoDto,
  asignarMaterialDto,
  moverMaterialDto,
  grupoMaterialDto,
  actualizarGrupoMaterialDto,
  idGrupoMaterialDto,
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
      return await ctx.servicios.biblioteca.obtenerMateriales(input);
    }),

  // Listado paginado (10/página, server-side) para la página de la biblioteca.
  listarPaginado: nutricionistaProcedimiento
    .input(listarMaterialesPaginadoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.obtenerMaterialesPaginado(input);
    }),

  crear: nutricionistaProcedimiento
    .input(crearMaterialDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.crearMaterial(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.actualizarMaterial(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idMaterialDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.biblioteca.eliminarMaterial(input.id);
      return { eliminado: true };
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.biblioteca.asignarMaterialAPaciente(input);
      return { asignado: true };
    }),

  // Todos los pacientes vigentes de una vez (el selector es paginado).
  compartirConTodos: nutricionistaProcedimiento
    .input(idMaterialDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.compartirMaterialConTodos(input.id);
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(asignarMaterialDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.biblioteca.desasignarMaterialDePaciente(input);
      return { desasignado: true };
    }),

  pacientesAsignados: nutricionistaProcedimiento
    .input(idMaterialDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.obtenerPacientesDeMaterial(
        input.id,
      );
    }),

  // El nutricionista consulta el material compartido con un paciente concreto.
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.obtenerMaterialesDelPaciente(
        input.pacienteId,
      );
    }),

  // --- Carpetas de la biblioteca ---

  /** Mueve un material a una carpeta, o lo saca (grupoId null). */
  moverAGrupo: nutricionistaProcedimiento
    .input(moverMaterialDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.biblioteca.moverMaterialAGrupo(input);
      return { movido: true };
    }),

  obtenerGrupos: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.biblioteca.obtenerGrupos();
  }),

  crearGrupo: nutricionistaProcedimiento
    .input(grupoMaterialDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.crearGrupo(input);
    }),

  actualizarGrupo: nutricionistaProcedimiento
    .input(actualizarGrupoMaterialDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.biblioteca.actualizarGrupo(input);
    }),

  eliminarGrupo: nutricionistaProcedimiento
    .input(idGrupoMaterialDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.biblioteca.eliminarGrupo(input.id);
      return { eliminado: true };
    }),

  // Portal: el paciente ve su material (pacienteId de la sesión).
  obtenerMiMaterial: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.biblioteca.obtenerMaterialesDelPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),
});

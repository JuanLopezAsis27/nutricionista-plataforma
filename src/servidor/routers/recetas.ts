import { z } from "zod";
import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  crearRecetaDto,
  actualizarRecetaDto,
  idRecetaDto,
  archivoDeRecetaDto,
  marcarFotoPrincipalDto,
  filtroRecetasDto,
  listarRecetasPaginadoDto,
  asignarRecetaDto,
} from "@/aplicacion/dtos/receta.dto";

/**
 * Router del Recetario (presentación → aplicación).
 *
 * La gestión es del NUTRICIONISTA; el paciente solo ve las recetas que le
 * fueron compartidas (obtenerMisRecetas, con pacienteId tomado de la sesión).
 */
export const routerRecetas = crearRouter({
  // Lista completa (sin paginar): la usan los selectores (ej. editor de planes).
  obtenerTodas: nutricionistaProcedimiento
    .input(filtroRecetasDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.receta.obtenerRecetas(input);
    }),

  // Listado paginado (10/página, server-side) para la página del recetario.
  listarPaginado: nutricionistaProcedimiento
    .input(listarRecetasPaginadoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.receta.obtenerRecetasPaginado(input);
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idRecetaDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.receta.obtenerRecetaPorId(input.id);
    }),

  crear: nutricionistaProcedimiento
    .input(crearRecetaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.receta.crearReceta(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.receta.actualizarReceta(input);
    }),

  /** Borra una foto o un documento adjunto de la receta. */
  eliminarArchivo: nutricionistaProcedimiento
    .input(archivoDeRecetaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.receta.eliminarArchivoDeReceta(
        input.recetaId,
        input.archivoId,
      );
    }),

  /** Elige cuál de las fotos representa la receta. */
  marcarFotoPrincipal: nutricionistaProcedimiento
    .input(marcarFotoPrincipalDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.receta.marcarFotoPrincipal(
        input.recetaId,
        input.fotoId,
      );
    }),

  eliminar: nutricionistaProcedimiento
    .input(idRecetaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.receta.eliminarReceta(input.id);
      return { eliminado: true };
    }),

  asignarAPaciente: nutricionistaProcedimiento
    .input(asignarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.receta.asignarRecetaAPaciente(input);
      return { asignado: true };
    }),

  desasignarDePaciente: nutricionistaProcedimiento
    .input(asignarRecetaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.receta.desasignarRecetaDePaciente(input);
      return { desasignado: true };
    }),

  // Ids de los pacientes con los que se compartió una receta (para el diálogo
  // de asignación del nutricionista).
  pacientesAsignados: nutricionistaProcedimiento
    .input(idRecetaDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.receta.obtenerPacientesDeReceta(input.id);
    }),

  // Recetas compartidas con un paciente concreto (vista del nutricionista).
  obtenerDelPaciente: nutricionistaProcedimiento
    .input(z.object({ pacienteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.receta.obtenerRecetasDelPaciente(
        input.pacienteId,
      );
    }),

  // Portal: el paciente ve sus recetas (pacienteId de la sesión).
  obtenerMisRecetas: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.receta.obtenerRecetasDelPaciente(
      pacienteDeSesion(ctx.usuario),
    );
  }),
});

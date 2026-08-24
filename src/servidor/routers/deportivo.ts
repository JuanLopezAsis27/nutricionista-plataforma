import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  guardarPerfilDeportivoDto,
  crearCompetenciaDto,
  actualizarCompetenciaDto,
  idPacienteDeportivoDto,
  idCompetenciaDto,
} from "@/aplicacion/dtos/deportivo.dto";

/**
 * Router del módulo deportivo (perfil del deportista + calendario de
 * competencias). La gestión es del NUTRICIONISTA; el paciente ve su propio
 * perfil y calendario (pacienteId tomado de la sesión).
 */
export const routerDeportivo = crearRouter({
  // --- Nutricionista (por pacienteId) --------------------------------------
  obtenerPerfil: nutricionistaProcedimiento
    .input(idPacienteDeportivoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.deportivo.obtenerPerfil(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  guardarPerfil: nutricionistaProcedimiento
    .input(guardarPerfilDeportivoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.deportivo.guardarPerfil(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  listarCompetencias: nutricionistaProcedimiento
    .input(idPacienteDeportivoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.deportivo.listarCompetencias(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crearCompetencia: nutricionistaProcedimiento
    .input(crearCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.deportivo.crearCompetencia(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarCompetencia: nutricionistaProcedimiento
    .input(actualizarCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.deportivo.actualizarCompetencia(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarCompetencia: nutricionistaProcedimiento
    .input(idCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.deportivo.eliminarCompetencia(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Portal del paciente (pacienteId de la sesión) -----------------------
  miPerfil: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.deportivo.obtenerPerfil(ctx.usuario.pacienteId);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  misCompetencias: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.deportivo.listarCompetencias(ctx.usuario.pacienteId);
    } catch (error) {
      throw aTRPCError(error);
    }
  }),
});

import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
      return await ctx.servicios.deportivo.obtenerPerfil(input.pacienteId);
    }),

  guardarPerfil: nutricionistaProcedimiento
    .input(guardarPerfilDeportivoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.deportivo.guardarPerfil(input);
    }),

  listarCompetencias: nutricionistaProcedimiento
    .input(idPacienteDeportivoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.deportivo.listarCompetencias(input.pacienteId);
    }),

  crearCompetencia: nutricionistaProcedimiento
    .input(crearCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.deportivo.crearCompetencia(input);
    }),

  actualizarCompetencia: nutricionistaProcedimiento
    .input(actualizarCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.deportivo.actualizarCompetencia(input);
    }),

  eliminarCompetencia: nutricionistaProcedimiento
    .input(idCompetenciaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.deportivo.eliminarCompetencia(input.id);
      return { eliminado: true };
    }),

  // --- Portal del paciente (pacienteId de la sesión) -----------------------
  miPerfil: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.deportivo.obtenerPerfil(pacienteDeSesion(ctx.usuario));
  }),

  misCompetencias: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.deportivo.listarCompetencias(pacienteDeSesion(ctx.usuario));
  }),
});

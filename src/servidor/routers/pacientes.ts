import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  crearPacienteConAccesoDto,
  actualizarPacienteDto,
  idPacienteDto,
  listarPacientesDto,
  archivarPacienteDto,
} from "@/aplicacion/dtos/paciente.dto";

/**
 * Router de Pacientes (presentación → aplicación).
 *
 * Todos los procedimientos son exclusivos del NUTRICIONISTA. Delegan en
 * ctx.servicios.paciente y convierten los errores de dominio con aTRPCError.
 */
export const routerPacientes = crearRouter({
  obtenerTodos: nutricionistaProcedimiento
    .input(listarPacientesDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.obtenerPacientes(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  obtenerPorId: nutricionistaProcedimiento
    .input(idPacienteDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.obtenerPacientePorId(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crear: nutricionistaProcedimiento
    .input(crearPacienteConAccesoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.crearPaciente(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarPacienteDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.actualizarPaciente(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  /**
   * Baja lógica: saca al paciente de los listados y de las estadísticas pero
   * conserva su historia clínica. Es la alternativa a `eliminar`, que borra en
   * cascada turnos, antropometrías y laboratorios.
   */
  archivar: nutricionistaProcedimiento
    .input(archivarPacienteDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.archivarPaciente(input.id, input.motivo ?? null);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  reactivar: nutricionistaProcedimiento
    .input(idPacienteDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.paciente.reactivarPaciente(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idPacienteDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.paciente.eliminarPaciente(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { rangoTrackingDto, rangoTrackingPacienteDto } from "@/aplicacion/dtos/tracking.dto";

/**
 * Router del Tracking del paciente. El paciente ve SU progreso (pacienteId de la
 * sesión); el nutricionista lo ve por pacienteId explícito.
 */
export const routerTracking = crearRouter({
  // Portal del paciente
  miTracking: protegidoProcedimiento
    .input(rangoTrackingDto)
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.usuario.pacienteId) {
          throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
        }
        return await ctx.servicios.tracking.obtener(
          ctx.usuario.pacienteId,
          input.desde,
          input.hasta,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Vista del nutricionista
  dePaciente: nutricionistaProcedimiento
    .input(rangoTrackingPacienteDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.tracking.obtener(input.pacienteId, input.desde, input.hasta);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

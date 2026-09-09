import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  rangoTrackingDto,
  rangoTrackingPacienteDto,
} from "@/aplicacion/dtos/tracking.dto";

/**
 * Router del Tracking del paciente. El paciente ve SU progreso (pacienteId de la
 * sesión); el nutricionista lo ve por pacienteId explícito.
 */
export const routerTracking = crearRouter({
  // Portal del paciente
  miTracking: protegidoProcedimiento
    .input(rangoTrackingDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.tracking.obtener(
        pacienteDeSesion(ctx.usuario),
        input.desde,
        input.hasta,
      );
    }),

  // Vista del nutricionista
  dePaciente: nutricionistaProcedimiento
    .input(rangoTrackingPacienteDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.tracking.obtener(
        input.pacienteId,
        input.desde,
        input.hasta,
      );
    }),
});

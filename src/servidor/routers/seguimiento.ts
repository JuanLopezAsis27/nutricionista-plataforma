import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import {
  registrarSuplementoDto,
  actualizarSuplementoDto,
  idSuplementoDto,
  suplementosDePacienteDto,
  resolverAlertaDto,
  rangoInformeDto,
} from "@/aplicacion/dtos/seguimiento.dto";

/**
 * Router de Seguimiento (presentación → aplicación): suplementos, alertas
 * automáticas e informes. Todo del NUTRICIONISTA salvo misSuplementos.
 */
export const routerSeguimiento = crearRouter({
  // --- Suplementos ---------------------------------------------------------
  registrarSuplemento: nutricionistaProcedimiento
    .input(registrarSuplementoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.registrarSuplemento(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarSuplemento: nutricionistaProcedimiento
    .input(actualizarSuplementoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.actualizarSuplemento(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarSuplemento: nutricionistaProcedimiento
    .input(idSuplementoDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.seguimiento.eliminarSuplemento(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  suplementosDelPaciente: nutricionistaProcedimiento
    .input(suplementosDePacienteDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.obtenerSuplementosDelPaciente(
          input.pacienteId,
          input.incluirInactivos ?? true,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Portal: el paciente ve sus suplementos activos (pacienteId de la sesión).
  misSuplementos: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      if (!ctx.usuario.pacienteId) {
        throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
      }
      return await ctx.servicios.seguimiento.obtenerSuplementosDelPaciente(
        ctx.usuario.pacienteId,
        false,
      );
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  // --- Alertas -------------------------------------------------------------
  alertasPendientes: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.seguimiento.obtenerAlertasPendientes();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  contarAlertas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.seguimiento.contarAlertasPendientes();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  resolverAlerta: nutricionistaProcedimiento
    .input(resolverAlertaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.resolverAlerta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Disparo manual del barrido (además del cron diario del worker).
  generarAlertas: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    try {
      return await ctx.servicios.seguimiento.generarAlertas();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  // --- Informes ------------------------------------------------------------
  informeProgreso: nutricionistaProcedimiento
    .input(rangoInformeDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.obtenerInformeProgreso(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  informeHabitos: nutricionistaProcedimiento
    .input(rangoInformeDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.seguimiento.obtenerInformeHabitos(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

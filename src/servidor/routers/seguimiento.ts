import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
      return await ctx.servicios.seguimiento.registrarSuplemento(input);
    }),

  actualizarSuplemento: nutricionistaProcedimiento
    .input(actualizarSuplementoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.seguimiento.actualizarSuplemento(input);
    }),

  eliminarSuplemento: nutricionistaProcedimiento
    .input(idSuplementoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.seguimiento.eliminarSuplemento(input.id);
      return { eliminado: true };
    }),

  suplementosDelPaciente: nutricionistaProcedimiento
    .input(suplementosDePacienteDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.seguimiento.obtenerSuplementosDelPaciente(
        input.pacienteId,
        input.incluirInactivos ?? true,
      );
    }),

  // Portal: el paciente ve sus suplementos activos (pacienteId de la sesión).
  misSuplementos: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.seguimiento.obtenerSuplementosDelPaciente(
      pacienteDeSesion(ctx.usuario),
      false,
    );
  }),

  // --- Alertas -------------------------------------------------------------
  alertasPendientes: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.seguimiento.obtenerAlertasPendientes();
  }),

  contarAlertas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.seguimiento.contarAlertasPendientes();
  }),

  resolverAlerta: nutricionistaProcedimiento
    .input(resolverAlertaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.seguimiento.resolverAlerta(input);
    }),

  // Disparo manual del barrido (además del cron diario del worker).
  generarAlertas: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    return await ctx.servicios.seguimiento.generarAlertas();
  }),

  // --- Informes ------------------------------------------------------------
  informeProgreso: nutricionistaProcedimiento
    .input(rangoInformeDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.seguimiento.obtenerInformeProgreso(input);
    }),

  informeHabitos: nutricionistaProcedimiento
    .input(rangoInformeDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.seguimiento.obtenerInformeHabitos(input);
    }),
});

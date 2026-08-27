import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  vistaPreviaRecordatorioDto,
  prepararRecordatorioDto,
  confirmarRecordatorioDto,
  enviarMensajeWhatsappDto,
} from "@/aplicacion/dtos/whatsapp.dto";
import { pacienteObjetivoDto } from "@/aplicacion/dtos/mensajeria.dto";

/**
 * Router de WhatsApp (presentación → aplicación).
 *
 * Es territorio exclusivo del NUTRICIONISTA: el portal del paciente no manda
 * ni confirma recordatorios.
 */
export const routerWhatsapp = crearRouter({
  vistaPreviaRecordatorio: nutricionistaProcedimiento
    .input(vistaPreviaRecordatorioDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.whatsapp.obtenerVistaPrevia(input.turnoId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  prepararRecordatorio: nutricionistaProcedimiento
    .input(prepararRecordatorioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.whatsapp.prepararRecordatorio(input, ctx.usuario.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  confirmarRecordatorio: nutricionistaProcedimiento
    .input(confirmarRecordatorioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.whatsapp.confirmarRecordatorio(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  /** Hilo de WhatsApp con un paciente (vacío si la API oficial no está conectada). */
  hiloDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.whatsapp.obtenerHilo(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  enviarMensaje: nutricionistaProcedimiento
    .input(enviarMensajeWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.whatsapp.enviarMensaje(input.pacienteId, input.cuerpo);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

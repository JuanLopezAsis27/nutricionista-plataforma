import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  enviarMensajeWhatsappDto,
  enviarPlantillaWhatsappDto,
} from "@/aplicacion/dtos/whatsapp.dto";
import { pacienteObjetivoDto } from "@/aplicacion/dtos/mensajeria.dto";

/**
 * Router de WhatsApp: el CANAL de conversación con un paciente.
 *
 * Los recordatorios de turno viven en `routerRecordatorios`. Acá quedó lo que
 * es propio de hablar por WhatsApp —leer el hilo y escribir—, que es territorio
 * exclusivo del NUTRICIONISTA: el portal del paciente no usa este canal.
 */
export const routerWhatsapp = crearRouter({
  /** Hilo de WhatsApp con un paciente (vacío si la API oficial no está conectada). */
  hiloDe: nutricionistaProcedimiento
    .input(pacienteObjetivoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.whatsapp.obtenerHilo(input.pacienteId);
    }),

  enviarMensaje: nutricionistaProcedimiento
    .input(enviarMensajeWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.whatsapp.enviarMensaje(
        input.pacienteId,
        input.cuerpo,
      );
    }),

  /** Manda una plantilla aprobada: lo único que Meta acepta con la ventana cerrada. */
  enviarPlantilla: nutricionistaProcedimiento
    .input(enviarPlantillaWhatsappDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.whatsapp.enviarPlantilla(
        input.pacienteId,
        input.plantillaId,
      );
    }),
});

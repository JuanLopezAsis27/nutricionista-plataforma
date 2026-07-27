import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  crearPlantillaDto,
  actualizarPlantillaDto,
  idPlantillaDto,
  enviarPruebaDto,
} from "@/aplicacion/dtos/secretaria.dto";

/**
 * Router de Secretaría (presentación → aplicación): gestión de plantillas de
 * email, envío de recordatorios de turnos y de emails de prueba, y auditoría
 * de envíos. Todo del NUTRICIONISTA.
 */
export const routerSecretaria = crearRouter({
  // --- Plantillas ----------------------------------------------------------
  listarPlantillas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.secretaria.listarPlantillas();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  obtenerPlantilla: nutricionistaProcedimiento
    .input(idPlantillaDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.secretaria.obtenerPlantilla(input.id);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  crearPlantilla: nutricionistaProcedimiento
    .input(crearPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.secretaria.crearPlantilla(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarPlantilla: nutricionistaProcedimiento
    .input(actualizarPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.secretaria.actualizarPlantilla(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarPlantilla: nutricionistaProcedimiento
    .input(idPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.secretaria.eliminarPlantilla(input.id);
        return { eliminada: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Envíos --------------------------------------------------------------
  enviarPrueba: nutricionistaProcedimiento
    .input(enviarPruebaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.secretaria.enviarEmailDePrueba(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // Disparo manual del barrido (además del cron diario del worker).
  enviarRecordatorios: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    try {
      return await ctx.servicios.secretaria.enviarRecordatorios();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  emailsRecientes: nutricionistaProcedimiento
    .input(z.object({ limite: z.number().int().positive().max(100).optional() }))
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.secretaria.listarEmailsRecientes(input.limite);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

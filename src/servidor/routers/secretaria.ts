import { z } from "zod";
import { crearRouter, nutricionistaProcedimiento } from "../trpc";
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
    return await ctx.servicios.secretaria.listarPlantillas();
  }),

  obtenerPlantilla: nutricionistaProcedimiento
    .input(idPlantillaDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.secretaria.obtenerPlantilla(input.id);
    }),

  crearPlantilla: nutricionistaProcedimiento
    .input(crearPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.secretaria.crearPlantilla(input);
    }),

  actualizarPlantilla: nutricionistaProcedimiento
    .input(actualizarPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.secretaria.actualizarPlantilla(input);
    }),

  eliminarPlantilla: nutricionistaProcedimiento
    .input(idPlantillaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.secretaria.eliminarPlantilla(input.id);
      return { eliminada: true };
    }),

  // --- Envíos --------------------------------------------------------------
  enviarPrueba: nutricionistaProcedimiento
    .input(enviarPruebaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.secretaria.enviarEmailDePrueba(input);
    }),

  // Disparo manual del barrido (además del cron diario del worker).
  enviarRecordatorios: nutricionistaProcedimiento.mutation(async ({ ctx }) => {
    return await ctx.servicios.secretaria.enviarRecordatorios();
  }),

  emailsRecientes: nutricionistaProcedimiento
    .input(z.object({ limite: z.number().int().positive().max(100).optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.secretaria.listarEmailsRecientes(input.limite);
    }),
});

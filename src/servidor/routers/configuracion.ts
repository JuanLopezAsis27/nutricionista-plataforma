import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { guardarConfiguracionDto } from "@/aplicacion/dtos/configuracion.dto";

/**
 * Router de Configuración del consultorio (solo NUTRICIONISTA): preferencias de
 * turnos (duración/paso/horarios) y membrete del profesional.
 */
export const routerConfiguracion = crearRouter({
  obtener: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.configuracion.obtener();
  }),

  guardar: nutricionistaProcedimiento
    .input(guardarConfiguracionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.configuracion.guardar(input);
    }),
});

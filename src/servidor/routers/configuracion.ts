import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { guardarConfiguracionDto } from "@/aplicacion/dtos/configuracion.dto";

/**
 * Router de Configuración del consultorio (solo NUTRICIONISTA): preferencias de
 * turnos (duración/paso/horarios) y membrete del profesional.
 */
export const routerConfiguracion = crearRouter({
  obtener: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.configuracion.obtener();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  guardar: nutricionistaProcedimiento
    .input(guardarConfiguracionDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.configuracion.guardar(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

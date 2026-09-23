import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  eliminarCredencialesDto,
  guardarCredencialesDto,
} from "@/aplicacion/dtos/credenciales.dto";

/**
 * Router de credenciales de integración (solo NUTRICIONISTA). Deja cargar las
 * de WhatsApp y los criterios de ingredientes; `estado` no revela secretos y
 * dice si la plataforma tiene IA (que ya no se configura acá).
 */
export const routerCredenciales = crearRouter({
  estado: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.credenciales.obtenerEstado();
  }),

  guardar: nutricionistaProcedimiento
    .input(guardarCredencialesDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.credenciales.guardar(input);
      return { ok: true };
    }),

  eliminar: nutricionistaProcedimiento
    .input(eliminarCredencialesDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.credenciales.eliminar(input.integracion);
      return { ok: true };
    }),
});

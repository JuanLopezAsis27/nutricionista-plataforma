import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  eliminarCredencialesDto,
  guardarCredencialesDto,
} from "@/aplicacion/dtos/credenciales.dto";

/**
 * Router de credenciales de integración (solo NUTRICIONISTA). Deja cargar la
 * clave de Claude y las de FatSecret desde la app; `estado` no revela secretos.
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

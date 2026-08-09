import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import { guardarCredencialesDto } from "@/aplicacion/dtos/credenciales.dto";

/**
 * Router de credenciales de integración (solo NUTRICIONISTA). Deja cargar la
 * clave de Claude y las de FatSecret desde la app; `estado` no revela secretos.
 */
export const routerCredenciales = crearRouter({
  estado: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.credenciales.obtenerEstado();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  guardar: nutricionistaProcedimiento
    .input(guardarCredencialesDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.credenciales.guardar(input);
        return { ok: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

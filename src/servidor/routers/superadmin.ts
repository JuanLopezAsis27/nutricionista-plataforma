import { crearRouter, superadminProcedimiento } from "../trpc";
import {
  crearCuentaNutricionistaDto,
  cambiarEstadoNutricionistaDto,
} from "@/aplicacion/dtos/superadmin.dto";

/**
 * Router del SuperAdmin (solo rol SUPERADMIN): gestión de las cuentas de
 * nutricionista. Cada nutricionista es un inquilino aislado.
 */
export const routerSuperAdmin = crearRouter({
  listarNutricionistas: superadminProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.superadmin.listarNutricionistas();
  }),

  crearNutricionista: superadminProcedimiento
    .input(crearCuentaNutricionistaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.superadmin.crearNutricionista(input);
    }),

  cambiarEstado: superadminProcedimiento
    .input(cambiarEstadoNutricionistaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.superadmin.cambiarEstado(
        input.id,
        input.activo,
      );
    }),
});

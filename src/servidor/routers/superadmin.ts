import { crearRouter, superadminProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
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
    try {
      return await ctx.servicios.superadmin.listarNutricionistas();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  crearNutricionista: superadminProcedimiento
    .input(crearCuentaNutricionistaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.superadmin.crearNutricionista(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  cambiarEstado: superadminProcedimiento
    .input(cambiarEstadoNutricionistaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.superadmin.cambiarEstado(input.id, input.activo);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

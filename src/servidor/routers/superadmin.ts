import { crearRouter, superadminProcedimiento } from "../trpc";
import {
  crearCuentaNutricionistaDto,
  cambiarEstadoNutricionistaDto,
} from "@/aplicacion/dtos/superadmin.dto";
import {
  eliminarClaveIADto,
  guardarIAPlataformaDto,
  registrosUsoIADto,
  resumenUsoIADto,
} from "@/aplicacion/dtos/iaPlataforma.dto";

/**
 * Router del SuperAdmin (solo rol SUPERADMIN): gestión de las cuentas de
 * nutricionista —cada una es un inquilino aislado— y la IA de la plataforma,
 * cuyas claves comparten todos los consultorios.
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

  // --- IA de la plataforma ---------------------------------------------------

  estadoIA: superadminProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.iaPlataforma.obtenerEstado();
  }),

  guardarIA: superadminProcedimiento
    .input(guardarIAPlataformaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.iaPlataforma.guardar(input);
      return { ok: true };
    }),

  eliminarClaveIA: superadminProcedimiento
    .input(eliminarClaveIADto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.iaPlataforma.eliminarClave(input.proveedor);
      return { ok: true };
    }),

  /** Pregunta a cada proveedor: tarda lo que tarden ellos. */
  saldosIA: superadminProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.iaPlataforma.consultarSaldos();
  }),

  resumenUsoIA: superadminProcedimiento
    .input(resumenUsoIADto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.iaPlataforma.resumirUso(input.dias);
    }),

  registrosUsoIA: superadminProcedimiento
    .input(registrosUsoIADto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.iaPlataforma.listarRegistros(input);
    }),
});

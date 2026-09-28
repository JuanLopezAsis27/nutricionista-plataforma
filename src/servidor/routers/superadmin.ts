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
import {
  crearAlimentoPropioDto,
  actualizarAlimentoPropioDto,
  idAlimentoPropioDto,
  listarAlimentosPropiosDto,
} from "@/aplicacion/dtos/alimentoPropio.dto";
import {
  crearRecetaBaseDto,
  actualizarRecetaBaseDto,
  idRecetaBaseDto,
  listarRecetasBaseDto,
} from "@/aplicacion/dtos/recetaBase.dto";

/**
 * Router del SuperAdmin (solo rol SUPERADMIN): gestión de las cuentas de
 * nutricionista —cada una es un inquilino aislado—, la IA de la plataforma,
 * cuyas claves comparten todos los consultorios, y el catálogo predeterminado
 * de alimentos y recetas que ven todos.
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

  // --- Catálogo predeterminado (migración 82) ---------------------------------
  // Alimentos y recetas que ven todos los consultorios. Se gestionan acá; los
  // consultorios los leen por sus propios routers (nutricion, recetas).

  estadoAlimentosBase: superadminProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.alimentosBase.estado();
  }),

  listarAlimentosBase: superadminProcedimiento
    .input(listarAlimentosPropiosDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosBase.listar(input);
    }),

  crearAlimentoBase: superadminProcedimiento
    .input(crearAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosBase.crear(input);
    }),

  actualizarAlimentoBase: superadminProcedimiento
    .input(actualizarAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosBase.actualizar(input);
    }),

  eliminarAlimentoBase: superadminProcedimiento
    .input(idAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.alimentosBase.eliminar(input.id);
      return { eliminado: true };
    }),

  // Alcance global: cuenta los usos en TODOS los consultorios.
  usosDeAlimentoBase: superadminProcedimiento
    .input(idAlimentoPropioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosBase.usos(input.id);
    }),

  vaciarAlimentosBase: superadminProcedimiento.mutation(async ({ ctx }) => {
    await ctx.servicios.alimentosBase.vaciar();
    return { ok: true };
  }),

  listarRecetasBase: superadminProcedimiento
    .input(listarRecetasBaseDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.recetasBase.listar(input);
    }),

  obtenerRecetaBase: superadminProcedimiento
    .input(idRecetaBaseDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.recetasBase.obtener(input.id);
    }),

  crearRecetaBase: superadminProcedimiento
    .input(crearRecetaBaseDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recetasBase.crear(input);
    }),

  actualizarRecetaBase: superadminProcedimiento
    .input(actualizarRecetaBaseDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.recetasBase.actualizar(input);
    }),

  eliminarRecetaBase: superadminProcedimiento
    .input(idRecetaBaseDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.recetasBase.eliminar(input.id);
      return { eliminado: true };
    }),
});

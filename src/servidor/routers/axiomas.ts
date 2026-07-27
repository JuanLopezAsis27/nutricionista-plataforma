import { crearRouter, nutricionistaProcedimiento, protegidoProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  crearAxiomaDto,
  actualizarAxiomaDto,
  idAxiomaDto,
} from "@/aplicacion/dtos/axioma.dto";

/**
 * Router de la Base de conocimiento (axiomas). El CRUD es del NUTRICIONISTA;
 * `activos` es `protegidoProcedimiento` para que el tracking del paciente pueda
 * leer las reglas contra las que se mide.
 */
export const routerAxiomas = crearRouter({
  listar: nutricionistaProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.axiomas.listar();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  activos: protegidoProcedimiento.query(async ({ ctx }) => {
    try {
      return await ctx.servicios.axiomas.listarActivos();
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  crear: nutricionistaProcedimiento
    .input(crearAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.axiomas.crear(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.axiomas.actualizar(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminar: nutricionistaProcedimiento
    .input(idAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.axiomas.eliminar(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

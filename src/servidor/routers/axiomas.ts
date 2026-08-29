import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
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
    return await ctx.servicios.axiomas.listar();
  }),

  activos: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.axiomas.listarActivos();
  }),

  crear: nutricionistaProcedimiento
    .input(crearAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.axiomas.crear(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.axiomas.actualizar(input);
    }),

  eliminar: nutricionistaProcedimiento
    .input(idAxiomaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.axiomas.eliminar(input.id);
      return { eliminado: true };
    }),
});

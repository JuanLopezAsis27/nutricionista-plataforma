import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { buscarAlimentoDto } from "@/aplicacion/dtos/nutricion.dto";

/**
 * Router de datos nutricionales (presentación → aplicación).
 * Autocompletado de ingredientes de recetas contra la base externa (Open Food
 * Facts). Solo el NUTRICIONISTA lo usa (edita el recetario).
 */
export const routerNutricion = crearRouter({
  buscarAlimento: nutricionistaProcedimiento
    .input(buscarAlimentoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.nutricion.buscarAlimento(input);
    }),

  // Alimentos propios (Excel). La importación va por route handler (multipart);
  // acá solo el estado (para la UI) y el vaciado.
  estadoAlimentosPropios: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.alimentosPropios.estado();
  }),

  vaciarAlimentosPropios: nutricionistaProcedimiento.mutation(
    async ({ ctx }) => {
      await ctx.servicios.alimentosPropios.vaciar();
      return { ok: true };
    },
  ),
});

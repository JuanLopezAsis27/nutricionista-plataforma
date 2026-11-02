import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { buscarAlimentoDto } from "@/aplicacion/dtos/nutricion.dto";
import {
  crearAlimentoPropioDto,
  actualizarAlimentoPropioDto,
  idAlimentoPropioDto,
  listarAlimentosPropiosDto,
  coincidenciaEnCatalogoDto,
} from "@/aplicacion/dtos/alimentoPropio.dto";
import {
  crearCategoriaAlimentoDto,
  renombrarCategoriaAlimentoDto,
  eliminarCategoriaAlimentoDto,
} from "@/aplicacion/dtos/categoriaAlimento.dto";

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

  // Gestión manual de la lista: ver, agregar, editar y borrar de a un alimento.
  listarAlimentosPropios: nutricionistaProcedimiento
    .input(listarAlimentosPropiosDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosPropios.listar(input);
    }),

  crearAlimentoPropio: nutricionistaProcedimiento
    .input(crearAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosPropios.crear(input);
    }),

  actualizarAlimentoPropio: nutricionistaProcedimiento
    .input(actualizarAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosPropios.actualizar(input);
    }),

  eliminarAlimentoPropio: nutricionistaProcedimiento
    .input(idAlimentoPropioDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.alimentosPropios.eliminar(input.id);
      return { eliminado: true };
    }),

  // Los predeterminados de la plataforma: el consultorio los ve (y los usa en
  // el buscador) pero no los edita. Los que agrega van a su lista propia.
  // Dónde se usa un alimento de SU lista: el aviso antes de editar o borrar.
  usosDeAlimento: nutricionistaProcedimiento
    .input(idAlimentoPropioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosPropios.usos(input.id);
    }),

  // Si lo que está cargando ya está en la plataforma (aviso, no bloqueo).
  coincidenciaEnCatalogo: nutricionistaProcedimiento
    .input(coincidenciaEnCatalogoDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosPropios.coincidenciaEnCatalogo(
        input.nombre,
        input.marca ?? null,
      );
    }),

  listarAlimentosBase: nutricionistaProcedimiento
    .input(listarAlimentosPropiosDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.alimentosBase.listar(input);
    }),

  // --- Categorías de alimento (migración 93) ---------------------------------
  // El consultorio VE las predeterminadas y las suyas, y gestiona solo las
  // suyas: renombrar o borrar una predeterminada sale como no encontrada.

  categoriasAlimento: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.categoriasAlimento.listar();
  }),

  crearCategoriaAlimento: nutricionistaProcedimiento
    .input(crearCategoriaAlimentoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.categoriasAlimento.crear(input.nombre);
    }),

  renombrarCategoriaAlimento: nutricionistaProcedimiento
    .input(renombrarCategoriaAlimentoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.categoriasAlimento.renombrar(
        input.id,
        input.nombre,
      );
    }),

  eliminarCategoriaAlimento: nutricionistaProcedimiento
    .input(eliminarCategoriaAlimentoDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.categoriasAlimento.eliminar(input.id);
      return { eliminado: true };
    }),
});

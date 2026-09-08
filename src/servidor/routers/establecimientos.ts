import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import {
  crearEstablecimientoDto,
  actualizarEstablecimientoDto,
  idEstablecimientoDto,
  listarEstablecimientosDto,
} from "@/aplicacion/dtos/establecimiento.dto";

/**
 * Router de Establecimientos (solo NUTRICIONISTA): los lugares donde atiende y
 * la agenda de cada uno.
 *
 * `vigente` es la sede que rige cuando nadie eligió otra, con la misma regla
 * que usa el servidor al agendar. La consumen los formularios de turno para
 * apagar de antemano los días y horarios que el servidor iba a rechazar.
 */
export const routerEstablecimientos = crearRouter({
  listar: nutricionistaProcedimiento
    .input(listarEstablecimientosDto.optional())
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.listar(input ?? {});
    }),

  vigente: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.establecimientos.vigente();
  }),

  crear: nutricionistaProcedimiento
    .input(crearEstablecimientoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.crear(input);
    }),

  actualizar: nutricionistaProcedimiento
    .input(actualizarEstablecimientoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.actualizar(input);
    }),

  archivar: nutricionistaProcedimiento
    .input(idEstablecimientoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.archivar(input.id);
    }),

  restaurar: nutricionistaProcedimiento
    .input(idEstablecimientoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.restaurar(input.id);
    }),

  fijarPrincipal: nutricionistaProcedimiento
    .input(idEstablecimientoDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.establecimientos.fijarPrincipal(input.id);
    }),
});

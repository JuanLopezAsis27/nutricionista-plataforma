import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  rangoEstadisticasDto,
  detalleEstadisticaDto,
} from "@/aplicacion/dtos/estadisticas.dto";

/**
 * Router de Estadísticas (presentación → aplicación). Solo lectura, solo
 * NUTRICIONISTA: pacientes activos/nuevos/en riesgo, asistencia e ingresos.
 */
export const routerEstadisticas = crearRouter({
  obtener: nutricionistaProcedimiento
    .input(rangoEstadisticasDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.estadisticas.obtener(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  detalle: nutricionistaProcedimiento
    .input(detalleEstadisticaDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.estadisticas.detalle(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

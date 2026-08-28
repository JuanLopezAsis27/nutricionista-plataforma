import { crearRouter, nutricionistaProcedimiento } from "../trpc";
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
      return await ctx.servicios.estadisticas.obtener(input);
    }),

  detalle: nutricionistaProcedimiento
    .input(detalleEstadisticaDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.estadisticas.detalle(input);
    }),
});

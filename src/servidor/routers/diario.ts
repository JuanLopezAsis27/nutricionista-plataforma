import { TRPCError } from "@trpc/server";
import {
  crearRouter,
  protegidoProcedimiento,
  nutricionistaProcedimiento,
} from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  guardarDiaDto,
  fechaDiaDto,
  agregarComidaDto,
  agregarActividadDto,
  idHijoDiarioDto,
  agregarFotoComidaDto,
  mesCalendarioDto,
  rangoDiarioDto,
} from "@/aplicacion/dtos/diario.dto";

/** pacienteId del usuario logueado; el diario es solo para pacientes. */
function pacienteDeSesion(usuario: { pacienteId: string | null }): string {
  if (!usuario.pacienteId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "El diario es exclusivo de los pacientes.",
    });
  }
  return usuario.pacienteId;
}

/**
 * Router del Diario del paciente.
 *
 * Los procedimientos "mi*" toman el pacienteId de la sesión (nunca del
 * input: un paciente no puede tocar el diario de otro). Las lecturas del
 * nutricionista reciben el pacienteId explícito.
 */
export const routerDiario = crearRouter({
  // --- Portal del paciente ------------------------------------------------------
  miDia: protegidoProcedimiento.input(fechaDiaDto).query(async ({ ctx, input }) => {
    try {
      return await ctx.servicios.diario.obtenerDia(
        pacienteDeSesion(ctx.usuario),
        input.fecha,
      );
    } catch (error) {
      throw aTRPCError(error);
    }
  }),

  miCalendario: protegidoProcedimiento
    .input(mesCalendarioDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.diario.obtenerCalendario(
          pacienteDeSesion(ctx.usuario),
          input.anio,
          input.mes,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  guardarMiDia: protegidoProcedimiento
    .input(guardarDiaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.diario.guardarDia(pacienteDeSesion(ctx.usuario), input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  agregarComida: protegidoProcedimiento
    .input(agregarComidaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.diario.agregarComida(
          pacienteDeSesion(ctx.usuario),
          input,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarComida: protegidoProcedimiento
    .input(idHijoDiarioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.diario.eliminarComida(pacienteDeSesion(ctx.usuario), input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  agregarActividad: protegidoProcedimiento
    .input(agregarActividadDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.diario.agregarActividad(
          pacienteDeSesion(ctx.usuario),
          input,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarActividad: protegidoProcedimiento
    .input(idHijoDiarioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.diario.eliminarActividad(
          pacienteDeSesion(ctx.usuario),
          input.id,
        );
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  agregarFotoComida: protegidoProcedimiento
    .input(agregarFotoComidaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.diario.agregarFotoComida(
          pacienteDeSesion(ctx.usuario),
          input.comidaId,
          input.archivoId,
        );
        return { vinculada: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Vistas del nutricionista ---------------------------------------------------
  obtenerRango: nutricionistaProcedimiento
    .input(rangoDiarioDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.diario.obtenerRango(
          input.pacienteId,
          input.desde,
          input.hasta,
        );
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

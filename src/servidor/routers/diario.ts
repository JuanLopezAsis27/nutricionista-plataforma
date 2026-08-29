import { TRPCError } from "@trpc/server";
import {
  crearRouter,
  protegidoProcedimiento,
  nutricionistaProcedimiento,
} from "../trpc";
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
  miDia: protegidoProcedimiento
    .input(fechaDiaDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.diario.obtenerDia(
        pacienteDeSesion(ctx.usuario),
        input.fecha,
      );
    }),

  miCalendario: protegidoProcedimiento
    .input(mesCalendarioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.diario.obtenerCalendario(
        pacienteDeSesion(ctx.usuario),
        input.anio,
        input.mes,
      );
    }),

  guardarMiDia: protegidoProcedimiento
    .input(guardarDiaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.diario.guardarDia(
        pacienteDeSesion(ctx.usuario),
        input,
      );
    }),

  agregarComida: protegidoProcedimiento
    .input(agregarComidaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.diario.agregarComida(
        pacienteDeSesion(ctx.usuario),
        input,
      );
    }),

  eliminarComida: protegidoProcedimiento
    .input(idHijoDiarioDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.diario.eliminarComida(
        pacienteDeSesion(ctx.usuario),
        input.id,
      );
      return { eliminado: true };
    }),

  agregarActividad: protegidoProcedimiento
    .input(agregarActividadDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.diario.agregarActividad(
        pacienteDeSesion(ctx.usuario),
        input,
      );
    }),

  eliminarActividad: protegidoProcedimiento
    .input(idHijoDiarioDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.diario.eliminarActividad(
        pacienteDeSesion(ctx.usuario),
        input.id,
      );
      return { eliminado: true };
    }),

  agregarFotoComida: protegidoProcedimiento
    .input(agregarFotoComidaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.diario.agregarFotoComida(
        pacienteDeSesion(ctx.usuario),
        input.comidaId,
        input.archivoId,
      );
      return { vinculada: true };
    }),

  // --- Vistas del nutricionista ---------------------------------------------------
  obtenerRango: nutricionistaProcedimiento
    .input(rangoDiarioDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.diario.obtenerRango(
        input.pacienteId,
        input.desde,
        input.hasta,
      );
    }),
});

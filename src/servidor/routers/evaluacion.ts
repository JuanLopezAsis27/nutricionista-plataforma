import { crearRouter, nutricionistaProcedimiento } from "../trpc";
import { aTRPCError } from "../errores-trpc";
import {
  guardarHistoriaClinicaDto,
  registrarAntropometriaDto,
  actualizarAntropometriaDto,
  idAntropometriaDto,
  registrarAlertaAlimentariaDto,
  actualizarAlertaAlimentariaDto,
  registrarLaboratorioDto,
  actualizarLaboratorioDto,
  idPacienteEvaluacionDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import { z } from "zod";

const idDto = z.object({ id: z.string().min(1) });

/**
 * Router de Evaluación Integral (presentación → aplicación).
 *
 * Todos los procedimientos son exclusivos del NUTRICIONISTA: la información
 * clínica no se expone al portal del paciente en esta fase.
 */
export const routerEvaluacion = crearRouter({
  // --- Historia clínica -------------------------------------------------------
  obtenerHistoria: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.obtenerHistoriaClinica(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  guardarHistoria: nutricionistaProcedimiento
    .input(guardarHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.guardarHistoriaClinica(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Antropometría ----------------------------------------------------------
  obtenerEvolucion: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.obtenerEvolucion(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  registrarAntropometria: nutricionistaProcedimiento
    .input(registrarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.registrarAntropometria(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarAntropometria: nutricionistaProcedimiento
    .input(actualizarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.actualizarAntropometria(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarAntropometria: nutricionistaProcedimiento
    .input(idAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.evaluacion.eliminarAntropometria(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Alertas alimentarias ---------------------------------------------------
  obtenerAlertas: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.obtenerAlertas(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  registrarAlerta: nutricionistaProcedimiento
    .input(registrarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.registrarAlerta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarAlerta: nutricionistaProcedimiento
    .input(actualizarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.actualizarAlerta(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarAlerta: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.evaluacion.eliminarAlerta(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  // --- Laboratorios -------------------------------------------------------------
  obtenerLaboratorios: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.obtenerLaboratorios(input.pacienteId);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  registrarLaboratorio: nutricionistaProcedimiento
    .input(registrarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.registrarLaboratorio(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  actualizarLaboratorio: nutricionistaProcedimiento
    .input(actualizarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.servicios.evaluacion.actualizarLaboratorio(input);
      } catch (error) {
        throw aTRPCError(error);
      }
    }),

  eliminarLaboratorio: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.servicios.evaluacion.eliminarLaboratorio(input.id);
        return { eliminado: true };
      } catch (error) {
        throw aTRPCError(error);
      }
    }),
});

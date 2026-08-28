import { crearRouter, nutricionistaProcedimiento } from "../trpc";
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
      return await ctx.servicios.evaluacion.obtenerHistoriaClinica(input.pacienteId);
    }),

  guardarHistoria: nutricionistaProcedimiento
    .input(guardarHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.guardarHistoriaClinica(input);
    }),

  // --- Antropometría ----------------------------------------------------------
  obtenerEvolucion: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.obtenerEvolucion(input.pacienteId);
    }),

  registrarAntropometria: nutricionistaProcedimiento
    .input(registrarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.registrarAntropometria(input);
    }),

  actualizarAntropometria: nutricionistaProcedimiento
    .input(actualizarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.actualizarAntropometria(input);
    }),

  eliminarAntropometria: nutricionistaProcedimiento
    .input(idAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.eliminarAntropometria(input.id);
      return { eliminado: true };
    }),

  // --- Alertas alimentarias ---------------------------------------------------
  obtenerAlertas: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.obtenerAlertas(input.pacienteId);
    }),

  registrarAlerta: nutricionistaProcedimiento
    .input(registrarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.registrarAlerta(input);
    }),

  actualizarAlerta: nutricionistaProcedimiento
    .input(actualizarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.actualizarAlerta(input);
    }),

  eliminarAlerta: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.eliminarAlerta(input.id);
      return { eliminado: true };
    }),

  // --- Laboratorios -------------------------------------------------------------
  obtenerLaboratorios: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.obtenerLaboratorios(input.pacienteId);
    }),

  registrarLaboratorio: nutricionistaProcedimiento
    .input(registrarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.registrarLaboratorio(input);
    }),

  actualizarLaboratorio: nutricionistaProcedimiento
    .input(actualizarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.actualizarLaboratorio(input);
    }),

  eliminarLaboratorio: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.eliminarLaboratorio(input.id);
      return { eliminado: true };
    }),
});

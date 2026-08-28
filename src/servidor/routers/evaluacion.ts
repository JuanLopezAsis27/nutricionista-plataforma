import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
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
  guardarObjetivoComposicionDto,
  idObjetivoComposicionDto,
  guardarPlantillaAntropometricaDto,
  idPlantillaAntropometricaDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import { z } from "zod";

const idDto = z.object({ id: z.string().min(1) });

/**
 * Router de Evaluación Integral (presentación → aplicación).
 *
 * Casi todo es exclusivo del NUTRICIONISTA: la historia clínica, los
 * laboratorios y las alertas alimentarias no se exponen al portal.
 *
 * La ÚNICA excepción es `miComposicion`: el paciente ve su propia
 * antropometría y sus objetivos de composición. Es lectura, resuelve el
 * paciente desde la sesión (nunca desde el input) y no alcanza al resto de la
 * evaluación.
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

  // --- Composición corporal ---------------------------------------------------
  obtenerComposicion: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.obtenerComposicion(input.pacienteId);
    }),

  guardarObjetivoComposicion: nutricionistaProcedimiento
    .input(guardarObjetivoComposicionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.guardarObjetivoComposicion(input);
    }),

  eliminarObjetivoComposicion: nutricionistaProcedimiento
    .input(idObjetivoComposicionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.eliminarObjetivoComposicion(input.id);
      return { eliminado: true };
    }),

  // --- Plantillas de carga ----------------------------------------------------
  // Son del consultorio, no de un paciente: definen qué campos pide el
  // formulario de medición.
  obtenerPlantillas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.obtenerPlantillas();
  }),

  guardarPlantilla: nutricionistaProcedimiento
    .input(guardarPlantillaAntropometricaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.guardarPlantilla(input);
    }),

  eliminarPlantilla: nutricionistaProcedimiento
    .input(idPlantillaAntropometricaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.eliminarPlantilla(input.id);
      return { eliminado: true };
    }),

  // Portal: el paciente ve su propia composición corporal, en modo lectura.
  // El paciente sale de la sesión, no del input: no hay forma de pedir el de
  // otro. La escritura (mediciones y objetivos) sigue siendo del profesional.
  miComposicion: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.obtenerComposicion(
      pacienteDeSesion(ctx.usuario),
    );
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

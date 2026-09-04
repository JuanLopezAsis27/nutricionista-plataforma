import {
  crearRouter,
  nutricionistaProcedimiento,
  protegidoProcedimiento,
} from "../trpc";
import { pacienteDeSesion } from "@/dominio/servicios/politicaAcceso";
import {
  guardarHistoriaClinicaDto,
  interpretarHistoriaClinicaDto,
  registrarAntropometriaDto,
  actualizarAntropometriaDto,
  idAntropometriaDto,
  interpretarMedicionesDto,
  importarMedicionesDto,
  registrarAlertaAlimentariaDto,
  actualizarAlertaAlimentariaDto,
  registrarLaboratorioDto,
  actualizarLaboratorioDto,
  idPacienteEvaluacionDto,
  guardarObjetivoComposicionDto,
  idObjetivoComposicionDto,
  guardarPlantillaAntropometricaDto,
  idPlantillaAntropometricaDto,
  guardarCampoHistoriaClinicaDto,
  idCampoHistoriaClinicaDto,
  registrarEvolucionDto,
  actualizarEvolucionDto,
  idEvolucionDto,
  importarEvolucionesDto,
  guardarCampoEvolucionDto,
  idCampoEvolucionDto,
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
      return await ctx.servicios.evaluacion.historiaClinica.obtener(
        input.pacienteId,
      );
    }),

  guardarHistoria: nutricionistaProcedimiento
    .input(guardarHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.historiaClinica.guardar(input);
    }),

  interpretarHistoriaDesdeArchivo: nutricionistaProcedimiento
    .input(interpretarHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.historiaClinica.interpretarDesdeArchivo(
        input,
      );
    }),

  /**
   * Campos personalizados que el consultorio agrega a la historia clínica.
   * Son del inquilino, no de un paciente: no llevan pacienteId.
   */
  obtenerCamposHistoria: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.historiaClinica.obtenerCampos();
  }),

  guardarCampoHistoria: nutricionistaProcedimiento
    .input(guardarCampoHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.historiaClinica.guardarCampo(input);
    }),

  eliminarCampoHistoria: nutricionistaProcedimiento
    .input(idCampoHistoriaClinicaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.historiaClinica.eliminarCampo(input.id);
      return { eliminado: true };
    }),

  // --- Evoluciones de control -------------------------------------------------
  // El repaso cualitativo de cada consulta. Es del profesional: no se expone
  // al portal del paciente, igual que la historia clínica.
  obtenerEvoluciones: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.evoluciones.obtener(
        input.pacienteId,
      );
    }),

  registrarEvolucion: nutricionistaProcedimiento
    .input(registrarEvolucionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.evoluciones.registrar(input);
    }),

  actualizarEvolucion: nutricionistaProcedimiento
    .input(actualizarEvolucionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.evoluciones.actualizar(input);
    }),

  eliminarEvolucion: nutricionistaProcedimiento
    .input(idEvolucionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.evoluciones.eliminar(input.id);
      return { eliminado: true };
    }),

  /** Alta en lote de las evoluciones que la IA leyó del documento. */
  importarEvoluciones: nutricionistaProcedimiento
    .input(importarEvolucionesDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.evoluciones.importar(input);
    }),

  /**
   * Campos personalizados que el consultorio agrega a las evoluciones.
   * Son del inquilino, no de un paciente: no llevan pacienteId.
   */
  obtenerCamposEvolucion: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.evoluciones.obtenerCampos();
  }),

  guardarCampoEvolucion: nutricionistaProcedimiento
    .input(guardarCampoEvolucionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.evoluciones.guardarCampo(input);
    }),

  eliminarCampoEvolucion: nutricionistaProcedimiento
    .input(idCampoEvolucionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.evoluciones.eliminarCampo(input.id);
      return { eliminado: true };
    }),

  // --- Antropometría ----------------------------------------------------------
  obtenerEvolucion: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.obtenerEvolucion(
        input.pacienteId,
      );
    }),

  registrarAntropometria: nutricionistaProcedimiento
    .input(registrarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.registrar(input);
    }),

  actualizarAntropometria: nutricionistaProcedimiento
    .input(actualizarAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.actualizar(input);
    }),

  eliminarAntropometria: nutricionistaProcedimiento
    .input(idAntropometriaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.antropometria.eliminar(input.id);
      return { eliminado: true };
    }),

  /**
   * Lee una planilla de evolución ya subida y devuelve las mediciones que
   * trae. Es mutation y no query porque llama a la IA: cuesta plata y no se
   * puede refetchear sola cuando la pantalla recupera el foco.
   */
  interpretarMedicionesDesdeArchivo: nutricionistaProcedimiento
    .input(interpretarMedicionesDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.interpretarDesdePlanilla(
        input,
      );
    }),

  importarMediciones: nutricionistaProcedimiento
    .input(importarMedicionesDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.importar(input);
    }),

  // --- Composición corporal ---------------------------------------------------
  obtenerComposicion: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.obtenerComposicion(
        input.pacienteId,
      );
    }),

  guardarObjetivoComposicion: nutricionistaProcedimiento
    .input(guardarObjetivoComposicionDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.guardarObjetivo(
        input,
      );
    }),

  eliminarObjetivoComposicion: nutricionistaProcedimiento
    .input(idObjetivoComposicionDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.antropometria.eliminarObjetivo(input.id);
      return { eliminado: true };
    }),

  // --- Plantillas de carga ----------------------------------------------------
  // Son del consultorio, no de un paciente: definen qué campos pide el
  // formulario de medición.
  obtenerPlantillas: nutricionistaProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.antropometria.obtenerPlantillas();
  }),

  guardarPlantilla: nutricionistaProcedimiento
    .input(guardarPlantillaAntropometricaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.antropometria.guardarPlantilla(
        input,
      );
    }),

  eliminarPlantilla: nutricionistaProcedimiento
    .input(idPlantillaAntropometricaDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.antropometria.eliminarPlantilla(input.id);
      return { eliminado: true };
    }),

  // Portal: el paciente ve su propia composición corporal, en modo lectura.
  // El paciente sale de la sesión, no del input: no hay forma de pedir el de
  // otro. La escritura (mediciones y objetivos) sigue siendo del profesional.
  miComposicion: protegidoProcedimiento.query(async ({ ctx }) => {
    return await ctx.servicios.evaluacion.antropometria.obtenerComposicion(
      pacienteDeSesion(ctx.usuario),
    );
  }),

  // --- Alertas alimentarias ---------------------------------------------------
  obtenerAlertas: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.alertasAlimentarias.obtener(
        input.pacienteId,
      );
    }),

  registrarAlerta: nutricionistaProcedimiento
    .input(registrarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.alertasAlimentarias.registrar(
        input,
      );
    }),

  actualizarAlerta: nutricionistaProcedimiento
    .input(actualizarAlertaAlimentariaDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.alertasAlimentarias.actualizar(
        input,
      );
    }),

  eliminarAlerta: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.alertasAlimentarias.eliminar(input.id);
      return { eliminado: true };
    }),

  // --- Laboratorios -------------------------------------------------------------
  obtenerLaboratorios: nutricionistaProcedimiento
    .input(idPacienteEvaluacionDto)
    .query(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.laboratorios.obtener(
        input.pacienteId,
      );
    }),

  registrarLaboratorio: nutricionistaProcedimiento
    .input(registrarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.laboratorios.registrar(input);
    }),

  actualizarLaboratorio: nutricionistaProcedimiento
    .input(actualizarLaboratorioDto)
    .mutation(async ({ ctx, input }) => {
      return await ctx.servicios.evaluacion.laboratorios.actualizar(input);
    }),

  eliminarLaboratorio: nutricionistaProcedimiento
    .input(idDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.servicios.evaluacion.laboratorios.eliminar(input.id);
      return { eliminado: true };
    }),
});

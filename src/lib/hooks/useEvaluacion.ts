"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula todas las llamadas tRPC de la Evaluación Integral
 * (historia clínica, antropometría, alertas alimentarias, laboratorios).
 *
 * Las queries se devuelven como referencias de hook; las mutations vienen
 * preconfiguradas con toasts e invalidación de la caché del módulo.
 */
export function useEvaluacion() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const conToasts = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      void invalidar();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  return {
    utils,
    // Historia clínica
    obtenerHistoria: trpc.evaluacion.obtenerHistoria.useQuery,
    guardarHistoria: trpc.evaluacion.guardarHistoria.useMutation(
      conToasts("Historia clínica guardada."),
    ),
    // Sin conToasts: no persiste nada, así que ni invalida caché ni tira un
    // toast de éxito genérico. El propio formulario avisa al precargar.
    interpretarHistoriaDesdeArchivo:
      trpc.evaluacion.interpretarHistoriaDesdeArchivo.useMutation({
        onError: (error) => toast.error(error.message),
      }),
    // Campos personalizados de la historia clínica (del consultorio)
    obtenerCamposHistoria: trpc.evaluacion.obtenerCamposHistoria.useQuery,
    guardarCampoHistoria: trpc.evaluacion.guardarCampoHistoria.useMutation(
      conToasts("Campo guardado."),
    ),
    eliminarCampoHistoria: trpc.evaluacion.eliminarCampoHistoria.useMutation(
      conToasts("Campo eliminado. Lo ya cargado en las fichas se conserva."),
    ),
    // Evoluciones de control
    obtenerEvoluciones: trpc.evaluacion.obtenerEvoluciones.useQuery,
    registrarEvolucion: trpc.evaluacion.registrarEvolucion.useMutation(
      conToasts("Evolución registrada."),
    ),
    actualizarEvolucion: trpc.evaluacion.actualizarEvolucion.useMutation(
      conToasts("Evolución actualizada."),
    ),
    eliminarEvolucion: trpc.evaluacion.eliminarEvolucion.useMutation(
      conToasts("Evolución eliminada."),
    ),
    // El toast lo arma el llamador: cuántas entraron y cuántas quedaron
    // afuera es justamente lo que hay que decir de una importación.
    importarEvoluciones: trpc.evaluacion.importarEvoluciones.useMutation({
      onSuccess: () => void invalidar(),
      onError: (error) => toast.error(error.message),
    }),
    // Campos personalizados de las evoluciones (del consultorio)
    obtenerCamposEvolucion: trpc.evaluacion.obtenerCamposEvolucion.useQuery,
    guardarCampoEvolucion: trpc.evaluacion.guardarCampoEvolucion.useMutation(
      conToasts("Campo guardado."),
    ),
    eliminarCampoEvolucion: trpc.evaluacion.eliminarCampoEvolucion.useMutation(
      conToasts(
        "Campo eliminado. Lo ya cargado en las evoluciones se conserva.",
      ),
    ),
    // Antropometría
    obtenerEvolucion: trpc.evaluacion.obtenerEvolucion.useQuery,
    registrarAntropometria: trpc.evaluacion.registrarAntropometria.useMutation(
      conToasts("Medición registrada."),
    ),
    actualizarAntropometria:
      trpc.evaluacion.actualizarAntropometria.useMutation(
        conToasts("Medición actualizada."),
      ),
    eliminarAntropometria: trpc.evaluacion.eliminarAntropometria.useMutation(
      conToasts("Medición eliminada."),
    ),
    // Sin conToasts: no persiste nada. La pantalla de revisión muestra lo que
    // se leyó y el profesional decide qué importar.
    interpretarMedicionesDesdeArchivo:
      trpc.evaluacion.interpretarMedicionesDesdeArchivo.useMutation({
        onError: (error) => toast.error(error.message),
      }),
    // El toast lo arma el llamador: cuántas entraron y cuántas quedaron
    // afuera es justamente lo que hay que decir de una importación.
    importarMediciones: trpc.evaluacion.importarMediciones.useMutation({
      onSuccess: () => void invalidar(),
      onError: (error) => toast.error(error.message),
    }),
    // Composición corporal
    obtenerComposicion: trpc.evaluacion.obtenerComposicion.useQuery,
    /** Portal del paciente: su propia composición (el id sale de la sesión). */
    miComposicion: trpc.evaluacion.miComposicion.useQuery,
    guardarObjetivoComposicion:
      trpc.evaluacion.guardarObjetivoComposicion.useMutation(
        conToasts("Objetivo guardado."),
      ),
    eliminarObjetivoComposicion:
      trpc.evaluacion.eliminarObjetivoComposicion.useMutation(
        conToasts("Objetivo eliminado."),
      ),
    // Plantillas de carga
    obtenerPlantillas: trpc.evaluacion.obtenerPlantillas.useQuery,
    guardarPlantilla: trpc.evaluacion.guardarPlantilla.useMutation(
      conToasts("Plantilla guardada."),
    ),
    eliminarPlantilla: trpc.evaluacion.eliminarPlantilla.useMutation(
      conToasts("Plantilla eliminada."),
    ),
    // Alertas alimentarias
    obtenerAlertas: trpc.evaluacion.obtenerAlertas.useQuery,
    registrarAlerta: trpc.evaluacion.registrarAlerta.useMutation(
      conToasts("Alerta registrada."),
    ),
    actualizarAlerta: trpc.evaluacion.actualizarAlerta.useMutation(
      conToasts("Alerta actualizada."),
    ),
    eliminarAlerta: trpc.evaluacion.eliminarAlerta.useMutation(
      conToasts("Alerta eliminada."),
    ),
    // Laboratorios
    obtenerLaboratorios: trpc.evaluacion.obtenerLaboratorios.useQuery,
    registrarLaboratorio: trpc.evaluacion.registrarLaboratorio.useMutation(
      conToasts("Laboratorio registrado."),
    ),
    actualizarLaboratorio: trpc.evaluacion.actualizarLaboratorio.useMutation(
      conToasts("Laboratorio actualizado."),
    ),
    eliminarLaboratorio: trpc.evaluacion.eliminarLaboratorio.useMutation(
      conToasts("Laboratorio eliminado."),
    ),
  };
}

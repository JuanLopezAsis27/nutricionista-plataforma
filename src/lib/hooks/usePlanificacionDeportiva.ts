"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Encapsula las llamadas tRPC de la planificación deportiva (migración 94).
 * Las mutaciones invalidan TODO (`useInvalidar`): la misma planificación
 * aparece en el módulo, en la ficha del paciente y en su portal.
 */
export function usePlanificacionDeportiva() {
  const invalidar = useInvalidar();

  const opciones = (mensaje: string | null) => ({
    onSuccess: () => {
      if (mensaje) toast.success(mensaje);
      invalidar();
    },
    onError: (error: unknown) => avisarError(error),
  });

  return {
    listar: trpc.planificacionDeportiva.listar.useQuery,
    obtener: trpc.planificacionDeportiva.obtener.useQuery,
    grupos: trpc.planificacionDeportiva.grupos.useQuery,
    delPaciente: trpc.planificacionDeportiva.delPaciente.useQuery,
    pacientesDe: trpc.planificacionDeportiva.pacientesDe.useQuery,
    /** Portal: las del paciente de la sesión. */
    mias: trpc.planificacionDeportiva.mias.useQuery,
    /** Portal: cuántas tiene, sin traerlas (para el menú). */
    cuantasMias: trpc.planificacionDeportiva.cuantasMias.useQuery,

    crear: trpc.planificacionDeportiva.crear.useMutation(
      opciones("Planificación creada."),
    ),
    crearParaPaciente:
      trpc.planificacionDeportiva.crearParaPaciente.useMutation(
        opciones("Planificación creada y asignada al paciente."),
      ),
    actualizar: trpc.planificacionDeportiva.actualizar.useMutation(
      opciones("Planificación guardada."),
    ),
    eliminar: trpc.planificacionDeportiva.eliminar.useMutation(
      opciones("Planificación eliminada."),
    ),
    duplicar: trpc.planificacionDeportiva.duplicar.useMutation(
      opciones("Planificación duplicada."),
    ),
    mover: trpc.planificacionDeportiva.mover.useMutation(opciones(null)),
    crearGrupo: trpc.planificacionDeportiva.crearGrupo.useMutation(
      opciones("Carpeta creada."),
    ),
    actualizarGrupo: trpc.planificacionDeportiva.actualizarGrupo.useMutation(
      opciones("Carpeta actualizada."),
    ),
    eliminarGrupo: trpc.planificacionDeportiva.eliminarGrupo.useMutation(
      opciones("Carpeta eliminada."),
    ),
    asignar: trpc.planificacionDeportiva.asignar.useMutation(
      opciones("Planificación asignada."),
    ),
    desasignar: trpc.planificacionDeportiva.desasignar.useMutation(
      opciones("Planificación quitada al paciente."),
    ),
  };
}

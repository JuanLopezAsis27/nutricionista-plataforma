"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * La lista de deportes de la plataforma tal como la administra el SUPERADMIN
 * (migración 97). Los consultorios la leen por `deportivo.deportes`, desde el
 * buscador del perfil deportivo.
 */
export function useDeportes() {
  const invalidar = useInvalidar();
  const consulta = trpc.superadmin.deportes.useQuery();

  const opciones = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      invalidar();
    },
    onError: (error: unknown) => avisarError(error),
  });

  return {
    deportes: consulta.data ?? [],
    cargando: consulta.isLoading,
    crear: trpc.superadmin.crearDeporte.useMutation(
      opciones("Deporte agregado."),
    ),
    renombrar: trpc.superadmin.renombrarDeporte.useMutation(
      opciones("Deporte renombrado."),
    ),
    eliminar: trpc.superadmin.eliminarDeporte.useMutation(
      opciones("Deporte eliminado."),
    ),
    cambiarPlanificacion:
      trpc.superadmin.cambiarPlanificacionDeporte.useMutation(
        opciones("Planificación del deporte actualizada."),
      ),
  };
}

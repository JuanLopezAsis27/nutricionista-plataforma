"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula todas las llamadas tRPC de pacientes.
 *
 * Las queries se devuelven como referencias de hook (el componente las invoca
 * con sus argumentos). Las mutations vienen preconfiguradas con toasts e
 * invalidación de la caché.
 */
export function usePacientes() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.pacientes.crear.useMutation({
    onSuccess: () => {
      toast.success("Paciente creado correctamente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.pacientes.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Paciente actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.pacientes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Paciente eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.pacientes.obtenerTodos.useQuery,
    obtenerPorId: trpc.pacientes.obtenerPorId.useQuery,
    crear,
    actualizar,
    eliminar,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de la Configuración del consultorio. */
export function useConfiguracion() {
  const invalidar = useInvalidar();

  const guardar = trpc.configuracion.guardar.useMutation({
    onSuccess: () => {
      toast.success("Configuración guardada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    obtener: trpc.configuracion.obtener.useQuery,
    guardar,
  };
}

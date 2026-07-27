"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC de la Configuración del consultorio. */
export function useConfiguracion() {
  const utils = trpc.useUtils();

  const guardar = trpc.configuracion.guardar.useMutation({
    onSuccess: () => {
      toast.success("Configuración guardada.");
      void utils.configuracion.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    obtener: trpc.configuracion.obtener.useQuery,
    guardar,
  };
}

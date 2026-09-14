"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC de Integraciones (estado + desconexión de Google). */
export function useIntegraciones() {
  const utils = trpc.useUtils();

  const desconectarGoogle = trpc.integraciones.desconectarGoogle.useMutation({
    onSuccess: () => {
      toast.success("Google desconectado.");
      void utils.integraciones.estado.invalidate();
    },
    onError: (error) => avisarError(error),
  });

  return {
    estado: trpc.integraciones.estado.useQuery,
    desconectarGoogle,
  };
}

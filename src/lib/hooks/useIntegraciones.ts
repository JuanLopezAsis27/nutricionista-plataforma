"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC de Integraciones (estado + desconexión de Google). */
export function useIntegraciones() {
  const utils = trpc.useUtils();

  const desconectarGoogle = trpc.integraciones.desconectarGoogle.useMutation({
    onSuccess: () => {
      toast.success("Google desconectado.");
      void utils.integraciones.estado.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    estado: trpc.integraciones.estado.useQuery,
    desconectarGoogle,
  };
}

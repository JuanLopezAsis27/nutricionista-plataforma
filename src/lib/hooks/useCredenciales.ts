"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC de las credenciales de integración. */
export function useCredenciales() {
  const utils = trpc.useUtils();

  const guardar = trpc.credenciales.guardar.useMutation({
    onSuccess: () => {
      toast.success("Credenciales guardadas.");
      utils.credenciales.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    estado: trpc.credenciales.estado.useQuery,
    guardar,
  };
}

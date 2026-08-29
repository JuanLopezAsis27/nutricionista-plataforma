"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de las credenciales de integración. */
export function useCredenciales() {
  const invalidar = useInvalidar();

  const guardar = trpc.credenciales.guardar.useMutation({
    onSuccess: () => {
      toast.success("Credenciales guardadas.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    estado: trpc.credenciales.estado.useQuery,
    guardar,
  };
}

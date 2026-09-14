"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC de los system prompts personalizables de la IA. */
export function usePromptsIA() {
  const invalidar = useInvalidar();

  const guardar = trpc.promptsIA.guardar.useMutation({
    onSuccess: () => {
      toast.success("Instrucciones guardadas.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const restablecer = trpc.promptsIA.restablecer.useMutation({
    onSuccess: () => {
      toast.success("Se restablecieron las instrucciones originales.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    listar: trpc.promptsIA.listar.useQuery,
    guardar,
    restablecer,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de las métricas de dispositivo (wearables). */
export function useMetricas() {
  const invalidar = useInvalidar();

  const importar = trpc.metricas.importar.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.importadas} día(s) sincronizados.`);
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const fijarInclusion = trpc.metricas.fijarInclusion.useMutation({
    onSuccess: invalidar,
    onError: (error) => toast.error(error.message),
  });

  return {
    mias: trpc.metricas.mias.useQuery,
    dePaciente: trpc.metricas.dePaciente.useQuery,
    importar,
    fijarInclusion,
  };
}

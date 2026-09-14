"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC de la Base de conocimiento (axiomas). */
export function useAxiomas() {
  const invalidar = useInvalidar();

  const crear = trpc.axiomas.crear.useMutation({
    onSuccess: () => {
      toast.success("Axioma creado.");
      void invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizar = trpc.axiomas.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Axioma actualizado.");
      void invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminar = trpc.axiomas.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Axioma eliminado.");
      void invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    listar: trpc.axiomas.listar.useQuery,
    activos: trpc.axiomas.activos.useQuery,
    crear,
    actualizar,
    eliminar,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de la Base de conocimiento (axiomas). */
export function useAxiomas() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.axiomas.crear.useMutation({
    onSuccess: () => {
      toast.success("Axioma creado.");
      void invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.axiomas.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Axioma actualizado.");
      void invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.axiomas.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Axioma eliminado.");
      void invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    listar: trpc.axiomas.listar.useQuery,
    activos: trpc.axiomas.activos.useQuery,
    crear,
    actualizar,
    eliminar,
  };
}

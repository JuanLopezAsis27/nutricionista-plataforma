"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC del SuperAdmin (cuentas de nutricionista). */
export function useSuperAdmin() {
  const utils = trpc.useUtils();
  const invalidar = () => utils.superadmin.listarNutricionistas.invalidate();

  const crearNutricionista = trpc.superadmin.crearNutricionista.useMutation({
    onSuccess: () => {
      toast.success("Cuenta de nutricionista creada.");
      void invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const cambiarEstado = trpc.superadmin.cambiarEstado.useMutation({
    onSuccess: () => void invalidar(),
    onError: (error) => toast.error(error.message),
  });

  return {
    listarNutricionistas: trpc.superadmin.listarNutricionistas.useQuery,
    crearNutricionista,
    cambiarEstado,
  };
}

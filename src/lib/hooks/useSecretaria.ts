"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de Secretaría (plantillas de email y envíos). */
export function useSecretaria() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crearPlantilla = trpc.secretaria.crearPlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plantilla creada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarPlantilla = trpc.secretaria.actualizarPlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plantilla guardada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminarPlantilla = trpc.secretaria.eliminarPlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plantilla eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const enviarPrueba = trpc.secretaria.enviarPrueba.useMutation({
    onSuccess: (r) => {
      toast.success(`Email de prueba enviado a ${r.para}.`);
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listarPlantillas: trpc.secretaria.listarPlantillas.useQuery,
    emailsRecientes: trpc.secretaria.emailsRecientes.useQuery,
    crearPlantilla,
    actualizarPlantilla,
    eliminarPlantilla,
    enviarPrueba,
  };
}

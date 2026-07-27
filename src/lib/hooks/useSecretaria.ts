"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC de Secretaría (plantillas y envíos). */
export function useSecretaria() {
  const utils = trpc.useUtils();
  const invalidar = () => utils.secretaria.invalidate();

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

  const enviarRecordatorios = trpc.secretaria.enviarRecordatorios.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.enviados > 0
          ? `${r.enviados} recordatorio(s) enviado(s).`
          : "No había recordatorios pendientes para mañana.",
      );
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
    enviarRecordatorios,
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula las llamadas tRPC del diario del paciente (portal) y la lectura
 * del nutricionista. Las mutations invalidan la caché del módulo.
 */
export function useDiario() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const conToasts = (mensaje?: string) => ({
    onSuccess: () => {
      if (mensaje) toast.success(mensaje);
      void invalidar();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  return {
    utils,
    // Portal del paciente
    miDia: trpc.diario.miDia.useQuery,
    miCalendario: trpc.diario.miCalendario.useQuery,
    guardarMiDia: trpc.diario.guardarMiDia.useMutation(conToasts("Día guardado.")),
    agregarComida: trpc.diario.agregarComida.useMutation(conToasts("Comida registrada.")),
    eliminarComida: trpc.diario.eliminarComida.useMutation(conToasts("Comida eliminada.")),
    agregarActividad: trpc.diario.agregarActividad.useMutation(
      conToasts("Actividad registrada."),
    ),
    eliminarActividad: trpc.diario.eliminarActividad.useMutation(
      conToasts("Actividad eliminada."),
    ),
    agregarFotoComida: trpc.diario.agregarFotoComida.useMutation(
      conToasts("Foto vinculada."),
    ),
    // Vista del nutricionista
    obtenerRango: trpc.diario.obtenerRango.useQuery,
  };
}

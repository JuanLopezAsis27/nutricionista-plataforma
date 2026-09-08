"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula las llamadas tRPC de los establecimientos.
 *
 * `vigente` es la sede que rige cuando nadie eligió otra: la que usan los
 * formularios de turno para saber contra qué agenda apagar las franjas. Es la
 * misma regla que aplica el servidor al agendar, resuelta en un solo lugar.
 */
export function useEstablecimientos() {
  const invalidar = useInvalidar();

  const conAviso = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      invalidar();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  return {
    listar: trpc.establecimientos.listar.useQuery,
    vigente: trpc.establecimientos.vigente.useQuery,
    crear: trpc.establecimientos.crear.useMutation(
      conAviso("Establecimiento creado."),
    ),
    actualizar: trpc.establecimientos.actualizar.useMutation(
      conAviso("Establecimiento guardado."),
    ),
    archivar: trpc.establecimientos.archivar.useMutation(
      conAviso("Establecimiento archivado."),
    ),
    restaurar: trpc.establecimientos.restaurar.useMutation(
      conAviso("Establecimiento restaurado."),
    ),
    fijarPrincipal: trpc.establecimientos.fijarPrincipal.useMutation(
      conAviso("Establecimiento principal actualizado."),
    ),
  };
}

"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de mensajería (nutri y portal). */
export function useMensajeria() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const enviarA = trpc.mensajeria.enviarA.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => toast.error(error.message),
  });

  const enviar = trpc.mensajeria.enviar.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => toast.error(error.message),
  });

  const marcarLeidosDe = trpc.mensajeria.marcarLeidosDe.useMutation({
    onSuccess: () => invalidar(),
  });

  const marcarMisLeidos = trpc.mensajeria.marcarMisLeidos.useMutation({
    onSuccess: () => invalidar(),
  });

  return {
    utils,
    conversaciones: trpc.mensajeria.conversaciones.useQuery,
    noLeidos: trpc.mensajeria.noLeidos.useQuery,
    hiloDe: trpc.mensajeria.hiloDe.useQuery,
    miHilo: trpc.mensajeria.miHilo.useQuery,
    misNoLeidos: trpc.mensajeria.misNoLeidos.useQuery,
    enviarA,
    enviar,
    marcarLeidosDe,
    marcarMisLeidos,
  };
}

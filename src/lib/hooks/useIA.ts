"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Encapsula las llamadas tRPC del módulo de IA (asistente, comida, insights).
 *
 * Los dos chats NO pasan por acá para preguntar: usan las subscriptions
 * `preguntarEnVivo` / `analizarEnVivo` a través de `useRespuestaEnVivo`, que
 * transmiten la respuesta mientras el modelo la escribe. Las mutations
 * equivalentes siguen existiendo en el router, pero ningún componente las usa.
 */
export function useIA() {
  const utils = trpc.useUtils();

  const analizarFoto = trpc.ia.analizarFoto.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const eliminarConversacion = trpc.ia.eliminarConversacion.useMutation({
    onSuccess: () => {
      toast.success("Conversación eliminada.");
      void utils.ia.conversaciones.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminarMiConversacion = trpc.ia.eliminarMiConversacion.useMutation({
    onSuccess: () => {
      toast.success("Chat eliminado.");
      void utils.ia.misConversaciones.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const feedbackInsight = trpc.ia.feedbackInsight.useMutation({
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    misConversaciones: trpc.ia.misConversaciones.useQuery,
    miConversacion: trpc.ia.miConversacion.useQuery,
    insights: trpc.ia.insights.useQuery,
    estado: trpc.ia.estado.useQuery,
    conversaciones: trpc.ia.conversaciones.useQuery,
    conversacion: trpc.ia.conversacion.useQuery,
    analizarFoto,
    eliminarConversacion,
    eliminarMiConversacion,
    feedbackInsight,
  };
}

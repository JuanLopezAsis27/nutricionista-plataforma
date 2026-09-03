"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC del módulo de IA (asistente, comida, insights). */
export function useIA() {
  const utils = trpc.useUtils();

  const preguntar = trpc.ia.preguntar.useMutation({
    // El turno quedó guardado en un chat: se refrescan la lista lateral (por
    // el título nuevo, o por el que sube al tope) y el chat abierto.
    onSuccess: (respuesta) => {
      void utils.ia.misConversaciones.invalidate();
      void utils.ia.miConversacion.invalidate({
        id: respuesta.conversacionId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const analizarFoto = trpc.ia.analizarFoto.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const analizar = trpc.ia.analizar.useMutation({
    // La conversación quedó guardada: la lista lateral tiene que reflejarlo
    // (título nuevo, o la existente subiendo al tope por su actualizadoEn).
    onSuccess: () => void utils.ia.conversaciones.invalidate(),
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
    preguntar,
    analizarFoto,
    analizar,
    eliminarConversacion,
    eliminarMiConversacion,
    feedbackInsight,
  };
}

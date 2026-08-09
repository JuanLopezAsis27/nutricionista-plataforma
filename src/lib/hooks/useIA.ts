"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/** Encapsula las llamadas tRPC del módulo de IA (asistente, comida, insights). */
export function useIA() {
  const utils = trpc.useUtils();

  const preguntar = trpc.ia.preguntar.useMutation({
    onSuccess: () => void utils.ia.misConsultas.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const analizarFoto = trpc.ia.analizarFoto.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const analizar = trpc.ia.analizar.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const feedbackInsight = trpc.ia.feedbackInsight.useMutation({
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    misConsultas: trpc.ia.misConsultas.useQuery,
    insights: trpc.ia.insights.useQuery,
    estado: trpc.ia.estado.useQuery,
    preguntar,
    analizarFoto,
    analizar,
    feedbackInsight,
  };
}

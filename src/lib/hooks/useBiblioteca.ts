"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de la biblioteca de materiales. */
export function useBiblioteca() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.biblioteca.crear.useMutation({
    onSuccess: () => {
      toast.success("Material agregado a la biblioteca.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.biblioteca.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Material actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.biblioteca.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Material eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const asignar = trpc.biblioteca.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Material compartido con el paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const desasignar = trpc.biblioteca.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Material quitado del paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.biblioteca.obtenerTodos.useQuery,
    listarPaginado: trpc.biblioteca.listarPaginado.useQuery,
    pacientesAsignados: trpc.biblioteca.pacientesAsignados.useQuery,
    delPaciente: trpc.biblioteca.obtenerDelPaciente.useQuery,
    miMaterial: trpc.biblioteca.obtenerMiMaterial.useQuery,
    crear,
    actualizar,
    eliminar,
    asignar,
    desasignar,
  };
}

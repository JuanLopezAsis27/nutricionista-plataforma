"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC de la biblioteca de materiales. */
export function useBiblioteca() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.biblioteca.crear.useMutation({
    onSuccess: () => {
      toast.success("Material agregado a la biblioteca.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizar = trpc.biblioteca.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Material actualizado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminar = trpc.biblioteca.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Material eliminado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const asignar = trpc.biblioteca.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Material compartido con el paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const compartirConTodos = trpc.biblioteca.compartirConTodos.useMutation({
    onSuccess: ({ nuevos, pacientes }) => {
      toast.success(
        nuevos === 0
          ? "Ya estaba compartido con todos los pacientes."
          : `Material compartido con ${nuevos} paciente${nuevos === 1 ? "" : "s"} más (de ${pacientes}).`,
      );
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const desasignar = trpc.biblioteca.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Material quitado del paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const mover = trpc.biblioteca.moverAGrupo.useMutation({
    onSuccess: () => {
      toast.success("Material movido.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const crearGrupo = trpc.biblioteca.crearGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta creada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizarGrupo = trpc.biblioteca.actualizarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta actualizada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminarGrupo = trpc.biblioteca.eliminarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta eliminada. Sus materiales quedaron sin carpeta.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    utils,
    grupos: trpc.biblioteca.obtenerGrupos.useQuery,
    listar: trpc.biblioteca.obtenerTodos.useQuery,
    listarPaginado: trpc.biblioteca.listarPaginado.useQuery,
    pacientesAsignados: trpc.biblioteca.pacientesAsignados.useQuery,
    delPaciente: trpc.biblioteca.obtenerDelPaciente.useQuery,
    miMaterial: trpc.biblioteca.obtenerMiMaterial.useQuery,
    crear,
    actualizar,
    eliminar,
    asignar,
    compartirConTodos,
    desasignar,
    mover,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  };
}

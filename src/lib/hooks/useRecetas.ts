"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC del recetario. */
export function useRecetas() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.recetas.crear.useMutation({
    onSuccess: () => {
      toast.success("Receta creada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizar = trpc.recetas.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Receta actualizada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminar = trpc.recetas.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Receta eliminada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminarArchivo = trpc.recetas.eliminarArchivo.useMutation({
    onSuccess: () => {
      toast.success("Archivo borrado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const marcarFotoPrincipal = trpc.recetas.marcarFotoPrincipal.useMutation({
    onSuccess: () => {
      toast.success("Foto principal actualizada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const asignar = trpc.recetas.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Receta compartida con el paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const desasignar = trpc.recetas.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Receta quitada del paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const mover = trpc.recetas.moverAGrupo.useMutation({
    onSuccess: () => {
      toast.success("Receta movida.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const crearGrupo = trpc.recetas.crearGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta creada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizarGrupo = trpc.recetas.actualizarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta actualizada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminarGrupo = trpc.recetas.eliminarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta eliminada. Sus recetas quedaron sin carpeta.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    utils,
    listar: trpc.recetas.obtenerTodas.useQuery,
    grupos: trpc.recetas.obtenerGrupos.useQuery,
    listarPaginado: trpc.recetas.listarPaginado.useQuery,
    obtenerPorId: trpc.recetas.obtenerPorId.useQuery,
    pacientesAsignados: trpc.recetas.pacientesAsignados.useQuery,
    delPaciente: trpc.recetas.obtenerDelPaciente.useQuery,
    misRecetas: trpc.recetas.obtenerMisRecetas.useQuery,
    crear,
    actualizar,
    eliminar,
    eliminarArchivo,
    marcarFotoPrincipal,
    asignar,
    desasignar,
    mover,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  };
}
